package com.trucast.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "ScreenShare")
public class ScreenSharePlugin extends Plugin {

    @PluginMethod
    public void startScreenShare(PluginCall call) {
        // حفظ الطلب لاستكماله بعد الحصول على موافقة المستخدم
        saveCall(call);

        // استدعاء نافذة النظام لأخذ إذن التقاط الشاشة
        MediaProjectionManager projectionManager = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (projectionManager != null) {
            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            startActivityForResult(call, captureIntent, "screenCaptureResult");
        } else {
            call.reject("غير قادر على الوصول لخدمة تسجيل الشاشة");
        }
    }

    @ActivityCallback
    private void screenCaptureResult(PluginCall call, ActivityResult result) {
        // التحقق مما إذا كان المستخدم قد وافق على مشاركة الشاشة
        if (result.getResultCode() == Activity.RESULT_OK) {
            Intent serviceIntent = new Intent(getContext(), ScreenShareService.class);
            
            // تمرير مفاتيح الاتصال
            serviceIntent.putExtra("callId", call.getString("callId", ""));
            serviceIntent.putExtra("callType", call.getString("callType", "default"));
            serviceIntent.putExtra("apiKey", call.getString("apiKey", ""));
            serviceIntent.putExtra("userId", call.getString("userId", ""));
            serviceIntent.putExtra("userToken", call.getString("userToken", ""));

            // بدء تشغيل الخدمة في الخلفية بأمان
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } else {
            // في حال ضغط المستخدم على "إلغاء"
            call.reject("تم رفض إذن مشاركة الشاشة من قبل المستخدم");
        }
    }
}
