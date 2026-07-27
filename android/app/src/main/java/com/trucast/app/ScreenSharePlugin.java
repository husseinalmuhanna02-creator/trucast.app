package com.trucast.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScreenShare")
public class ScreenSharePlugin extends Plugin {

    @PluginMethod
    public void startScreenShare(PluginCall call) {
        MediaProjectionManager mediaProjectionManager =
                (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        if (mediaProjectionManager != null) {
            Intent intent = mediaProjectionManager.createScreenCaptureIntent();
            startActivityForResult(call, intent, "handleScreenShareResult");
        } else {
            call.reject("MediaProjectionManager is not available on this device.");
        }
    }

    @ActivityCallback
    public void handleScreenShareResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            // تشغيل خدمة التقاط الشاشة في الخلفية وتمرير إذن النظام إليها
            Intent serviceIntent = new Intent(getContext(), ScreenShareService.class);
            serviceIntent.putExtra("resultCode", result.getResultCode());
            serviceIntent.putExtra("data", result.getData());

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } else {
            call.reject("User denied screen capture permission");
        }
    }
}
