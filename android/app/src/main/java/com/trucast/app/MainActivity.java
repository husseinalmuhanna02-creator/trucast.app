package com.trucast.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. تسجيل الجسر أولاً ليتعرف عليه المحرك عند الإقلاع
        registerPlugin(ScreenSharePlugin.class);

        // 2. ثم بدء تهيئة التطبيق
        super.onCreate(savedInstanceState);
    }
}
