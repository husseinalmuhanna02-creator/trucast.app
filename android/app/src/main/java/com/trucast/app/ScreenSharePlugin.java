package com.trucast.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

@CapacitorPlugin(name = "ScreenShare")
public class ScreenSharePlugin extends Plugin {

    @PluginMethod
    public void startScreenShare(PluginCall call) {
        String callId = call.getString("callId", "");
        String callType = call.getString("callType", "default");
        String apiKey = call.getString("apiKey", "");
        String userId = call.getString("userId", "");
        String userToken = call.getString("userToken", "");

        Intent serviceIntent = new Intent(getContext(), ScreenShareService.class);
        serviceIntent.putExtra("callId", callId);
        serviceIntent.putExtra("callType", callType);
        serviceIntent.putExtra("apiKey", apiKey);
        serviceIntent.putExtra("userId", userId);
        serviceIntent.putExtra("userToken", userToken);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        JSObject ret = new JSObject();
        ret.put("status", "success");
        call.resolve(ret);
    }
}
