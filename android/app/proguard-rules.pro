# AKVENERGY Solar App — ProGuard Rules
# These rules prevent R8 from stripping classes needed by Capacitor and WebView.

# ── Capacitor core ────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# ── Capacitor plugins ─────────────────────────────────────────────────────
-keep class com.capacitorjs.plugins.** { *; }

# ── AndroidX / AppCompat ──────────────────────────────────────────────────
-keep class androidx.appcompat.** { *; }
-keep class androidx.core.** { *; }

# ── WebView JavaScript Bridge ─────────────────────────────────────────────
# Required so Capacitor's JS bridge can call back into Java
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Keep source file/line info for meaningful crash stack traces ───────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Suppress warnings for missing optional dependencies ───────────────────
-dontwarn com.google.firebase.**
-dontwarn org.apache.http.**
-dontwarn android.net.http.**
