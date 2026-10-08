require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'TickdoNative'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = { :type => 'UNLICENSED' }
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # On-device ML Kit text recognition (free, offline).
  s.dependency 'GoogleMLKit/TextRecognition'
  s.dependency 'GoogleMLKit/TextRecognitionDevanagari'

  s.source_files = '**/*.{h,m,swift}'
end
