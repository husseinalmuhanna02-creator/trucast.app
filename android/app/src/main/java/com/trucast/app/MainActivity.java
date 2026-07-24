package com.trucast.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState); // 1. تهيئة الجسر أولاً
        registerPlugin(ScreenSharePlugin.class); // 2. تسجيل إضافة مشاركة الشاشة
    }
}
