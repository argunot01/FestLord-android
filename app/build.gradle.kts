plugins {
 id("com.android.application")
 id("org.jetbrains.kotlin.android")
}
android {
 namespace = "kz.festlord.app"
 compileSdk = 35
 defaultConfig {
  applicationId = "kz.festlord.app"
  minSdk = 26
  targetSdk = 35
  versionCode = 10
  versionName = "1.0.0"
 }
 buildTypes {
  getByName("debug") {
   isDebuggable = false
  }
 }
 compileOptions {
  sourceCompatibility = JavaVersion.VERSION_17
  targetCompatibility = JavaVersion.VERSION_17
 }
 kotlinOptions { jvmTarget = "17" }
}
