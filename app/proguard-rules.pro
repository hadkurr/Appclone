# Add project specific ProGuard rules here.
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}
