package com.example

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import java.net.URLDecoder
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.example.ui.theme.DarkBg
import com.example.ui.theme.ElSotanoDeOsitoTheme

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Configurar tasa de refresco ultra fluida a 120Hz / máxima del panel
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.attributes = window.attributes.apply {
                    preferredRefreshRate = 120f
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                @Suppress("DEPRECATION")
                val display = windowManager.defaultDisplay
                val modes = display.supportedModes
                val highRateMode = modes.filter { it.refreshRate >= 89f }.maxByOrNull { it.refreshRate }
                if (highRateMode != null) {
                    val params = window.attributes
                    params.preferredDisplayModeId = highRateMode.modeId
                    window.attributes = params
                }
            }
        } catch (_: Exception) {}

        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        setContent {
            ElSotanoDeOsitoTheme {
                OsitoAppScreen(
                    onWebViewCreated = { webView = it }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView?.onPause()
    }

    override fun onDestroy() {
        webView?.destroy()
        webView = null
        super.onDestroy()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun OsitoAppScreen(
    onWebViewCreated: (WebView) -> Unit
) {
    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var hasPermissions by remember { mutableStateOf(false) }

    val permissionsLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        hasPermissions = grants.values.any { it }
    }

    LaunchedEffect(Unit) {
        permissionsLauncher.launch(
            arrayOf(
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.CAMERA
            )
        )
    }

    BackHandler(enabled = webViewRef?.canGoBack() == true) {
        webViewRef?.goBack()
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .testTag("osito_main_scaffold")
            .background(DarkBg),
        containerColor = DarkBg
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .testTag("osito_webview_container")
        ) {
            AndroidView(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("osito_webview"),
                factory = { context ->
                    WebView(context).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )

                        // Optimización de hardware para Helio G81 / Mali-G52
                        setLayerType(View.LAYER_TYPE_HARDWARE, null)
                        setBackgroundColor(0xFF080A0F.toInt())

                        settings.apply {
                            javaScriptEnabled = true
                            domStorageEnabled = true
                            mediaPlaybackRequiresUserGesture = false
                            allowFileAccess = true
                            allowContentAccess = true
                            loadWithOverviewMode = true
                            useWideViewPort = true
                            cacheMode = WebSettings.LOAD_DEFAULT
                            builtInZoomControls = false
                            displayZoomControls = false
                            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        }

                        addJavascriptInterface(object {
                            @android.webkit.JavascriptInterface
                            fun getGeminiApiKey(): String {
                                return try {
                                    BuildConfig.GEMINI_API_KEY
                                } catch (_: Exception) {
                                    ""
                                }
                            }
                        }, "AndroidBridge")

                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                url: String?
                            ): Boolean {
                                if (url == null) return false
                                // Si es un enlace de YouTube o externo, abrir en navegador / app externa
                                if (url.startsWith("https://www.youtube.com") ||
                                    url.startsWith("https://youtu.be") ||
                                    url.startsWith("https://x.com") ||
                                    url.startsWith("https://twitter.com")
                                ) {
                                    try {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                                        context.startActivity(intent)
                                        return true
                                    } catch (_: Exception) {}
                                }
                                return false
                            }

                            override fun shouldInterceptRequest(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): WebResourceResponse? {
                                val reqUri = request?.url ?: return super.shouldInterceptRequest(view, request)
                                val uriString = reqUri.toString()
                                if (uriString.startsWith("file:///android_asset/")) {
                                    try {
                                        var rawPath = reqUri.path ?: ""
                                        if (rawPath.startsWith("/android_asset/")) {
                                            rawPath = rawPath.substring("/android_asset/".length)
                                        } else if (rawPath.startsWith("/")) {
                                            rawPath = rawPath.substring(1)
                                        }
                                        val decodedPath = URLDecoder.decode(rawPath, "UTF-8")
                                        if (decodedPath.endsWith("musica_snowfall.mp3") || decodedPath.endsWith("fondo_banner_png.png")) {
                                            return WebResourceResponse(
                                                if (decodedPath.endsWith(".mp3")) "audio/mpeg" else "image/png",
                                                null,
                                                ByteArrayInputStream(ByteArray(0))
                                            )
                                        }

                                        val mappedPath = when (decodedPath) {
                                            "web/hallowen de osito.mp3" -> "web/halloween_osito.mp3"
                                            "web/cumple de osito.mp3" -> "web/cumple_osito.mp3"
                                            "web/navidad de osito.mp3" -> "web/navidad_osito.mp3"
                                            "web/san valentin de osito.mp3" -> "web/san_valentin_osito.mp3"
                                            "web/video hallowen.mp4" -> "web/fondos/halloween-lite.mp4"
                                            "web/Fondo Navidad.mp4" -> "web/fondos/navidad-lite.mp4"
                                            "web/fondo de cumple.mp4" -> "web/fondos/cumpleanos-lite.mp4"
                                            else -> decodedPath
                                        }

                                        val mimeType = when {
                                            mappedPath.endsWith(".html") -> "text/html"
                                            mappedPath.endsWith(".js") -> "application/javascript"
                                            mappedPath.endsWith(".css") -> "text/css"
                                            mappedPath.endsWith(".json") -> "application/json"
                                            mappedPath.endsWith(".png") -> "image/png"
                                            mappedPath.endsWith(".jpg") || mappedPath.endsWith(".jpeg") -> "image/jpeg"
                                            mappedPath.endsWith(".svg") -> "image/svg+xml"
                                            mappedPath.endsWith(".mp3") -> "audio/mpeg"
                                            mappedPath.endsWith(".mp4") -> "video/mp4"
                                            else -> "application/octet-stream"
                                        }
                                        val encoding = if (mimeType.startsWith("text/") || mimeType.contains("javascript") || mimeType.contains("json") || mimeType.contains("svg")) "UTF-8" else null
                                        val inputStream = context.assets.open(mappedPath)
                                        return WebResourceResponse(mimeType, encoding, inputStream)
                                    } catch (_: Exception) {}
                                }
                                return super.shouldInterceptRequest(view, request)
                            }
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onPermissionRequest(request: PermissionRequest?) {
                                request?.let { req ->
                                    val granted = mutableListOf<String>()
                                    for (resource in req.resources) {
                                        when (resource) {
                                            PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                                                if (ContextCompat.checkSelfPermission(
                                                        context,
                                                        Manifest.permission.RECORD_AUDIO
                                                    ) == PackageManager.PERMISSION_GRANTED
                                                ) {
                                                    granted.add(resource)
                                                }
                                            }
                                            PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                                                if (ContextCompat.checkSelfPermission(
                                                        context,
                                                        Manifest.permission.CAMERA
                                                    ) == PackageManager.PERMISSION_GRANTED
                                                ) {
                                                    granted.add(resource)
                                                }
                                            }
                                            else -> granted.add(resource)
                                        }
                                    }
                                    if (granted.isNotEmpty()) {
                                        req.grant(granted.toTypedArray())
                                    } else {
                                        req.grant(req.resources)
                                    }
                                }
                            }
                        }

                        loadUrl("file:///android_asset/web/index.html")
                        webViewRef = this
                        onWebViewCreated(this)
                    }
                }
            )
        }
    }
}
