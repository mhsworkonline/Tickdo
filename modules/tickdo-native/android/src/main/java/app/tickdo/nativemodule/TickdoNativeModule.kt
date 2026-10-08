package app.tickdo.nativemodule

import android.app.AlarmManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TickdoNativeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("TickdoNative")

    // Android 12+ needs the user to allow exact alarms; without it reminders can be late.
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      am.canScheduleExactAlarms()
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      launch(
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
      )
    }

    Function("isIgnoringBatteryOptimizations") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    // The list screen needs no special permission (unlike ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
    Function("openBatteryOptimizationSettings") {
      launch(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) || openAppDetails()
    }

    Function("openAppSettings") { openAppDetails() }

    Function("openNotificationSettings") {
      launch(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
    }

    // OEM "autostart" / background-launch screens. Tries known screens in order; false if none exists.
    Function("openAutostartSettings") {
      AUTOSTART_SCREENS.any { (pkg, cls) -> launch(Intent().setComponent(ComponentName(pkg, cls))) }
    }

    Function("manufacturer") { Build.MANUFACTURER ?: "" }

    AsyncFunction("recognizeText") { uri: String, script: String, promise: Promise ->
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject(CodedException("ERR_IMAGE", "Could not read image", e))
        return@AsyncFunction
      }
      val recognizer = if (script == "devanagari") {
        TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
      } else {
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      }
      recognizer.process(image)
        .addOnSuccessListener { result ->
          val lines = mutableListOf<Map<String, Any>>()
          result.textBlocks.forEachIndexed { blockIndex, block ->
            block.lines.forEach { line ->
              val box = line.boundingBox
              lines.add(
                mapOf(
                  "text" to line.text,
                  "block" to blockIndex,
                  "left" to (box?.left ?: 0),
                  "top" to (box?.top ?: 0),
                  "width" to (box?.width() ?: 0),
                  "height" to (box?.height() ?: 0),
                  "confidence" to line.confidence.toDouble()
                )
              )
            }
          }
          recognizer.close()
          promise.resolve(mapOf("width" to image.width, "height" to image.height, "lines" to lines))
        }
        .addOnFailureListener { e ->
          recognizer.close()
          promise.reject(CodedException("ERR_OCR", e.message ?: "Text recognition failed", e))
        }
    }
  }

  private fun openAppDetails(): Boolean =
    launch(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))

  private fun launch(intent: Intent): Boolean {
    return try {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val activity = appContext.currentActivity
      if (activity != null) activity.startActivity(intent) else context.startActivity(intent)
      true
    } catch (e: ActivityNotFoundException) {
      false
    } catch (e: SecurityException) {
      false
    }
  }

  companion object {
    private val AUTOSTART_SCREENS = listOf(
      // Xiaomi / Redmi / POCO (MIUI, HyperOS)
      "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
      // Realme / OPPO (ColorOS, Realme UI)
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
      "com.oplus.safecenter" to "com.oplus.safecenter.permission.startup.StartupAppListActivity",
      "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
      // Vivo / iQOO (Funtouch, OriginOS)
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager",
      // Samsung (One UI) battery screen
      "com.samsung.android.lool" to "com.samsung.android.sm.battery.ui.BatteryActivity",
      "com.samsung.android.lool" to "com.samsung.android.sm.ui.battery.BatteryActivity",
    )
  }
}
