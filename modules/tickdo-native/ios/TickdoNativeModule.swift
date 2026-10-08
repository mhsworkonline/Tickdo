import ExpoModulesCore
import MLKitTextRecognition
import MLKitTextRecognitionDevanagari
import MLKitVision
import UIKit

// iOS has no exact-alarm or battery-optimisation settings; those return neutral values.
// NOTE: written for the iOS milestone (Deliverable 10); compile and verify with an EAS iOS build.
public class TickdoNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TickdoNative")

    Function("canScheduleExactAlarms") { true }
    Function("openExactAlarmSettings") { false }
    Function("isIgnoringBatteryOptimizations") { true }
    Function("openBatteryOptimizationSettings") { false }
    Function("openAutostartSettings") { false }
    Function("manufacturer") { "Apple" }

    Function("openAppSettings") { () -> Bool in
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return false }
      DispatchQueue.main.async { UIApplication.shared.open(url) }
      return true
    }

    Function("openNotificationSettings") { () -> Bool in
      guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else { return false }
      DispatchQueue.main.async { UIApplication.shared.open(url) }
      return true
    }

    AsyncFunction("recognizeText") { (uri: String, script: String, promise: Promise) in
      guard let url = URL(string: uri), let data = try? Data(contentsOf: url), let uiImage = UIImage(data: data) else {
        promise.reject("ERR_IMAGE", "Could not read image")
        return
      }
      let image = VisionImage(image: uiImage)
      image.orientation = uiImage.imageOrientation
      let recognizer: TextRecognizer = script == "devanagari"
        ? TextRecognizer.textRecognizer(options: DevanagariTextRecognizerOptions())
        : TextRecognizer.textRecognizer(options: TextRecognizerOptions())
      recognizer.process(image) { result, error in
        if let error = error {
          promise.reject("ERR_OCR", error.localizedDescription)
          return
        }
        var lines: [[String: Any]] = []
        for (blockIndex, block) in (result?.blocks ?? []).enumerated() {
          for line in block.lines {
            let f = line.frame
            lines.append([
              "text": line.text,
              "block": blockIndex,
              "left": Int(f.origin.x),
              "top": Int(f.origin.y),
              "width": Int(f.size.width),
              "height": Int(f.size.height),
              "confidence": -1,
            ])
          }
        }
        promise.resolve([
          "width": Int(uiImage.size.width * uiImage.scale),
          "height": Int(uiImage.size.height * uiImage.scale),
          "lines": lines,
        ])
      }
    }
  }
}
