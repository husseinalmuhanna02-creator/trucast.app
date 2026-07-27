package com.trucast.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // هذا هو السطر السحري الذي سيفعل إضافة مشاركة الشاشة
        registerPlugin(ScreenSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
