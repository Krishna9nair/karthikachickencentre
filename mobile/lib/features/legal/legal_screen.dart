import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../app/env.dart';
import '../../app/theme.dart';

/// Auxiliary informational pages (Terms / Privacy / Cancellation) rendered
/// from the website so the legal copy stays in lockstep with what the user
/// sees on the web. Google Play allows WebView for auxiliary content.
class LegalScreen extends StatefulWidget {
  const LegalScreen({super.key, required this.slug});
  final String slug;
  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() => _loading = true),
          onPageFinished: (_) => setState(() => _loading = false),
        ),
      )
      ..loadRequest(Uri.parse('${Env.apiBaseUrl}/${widget.slug}'));
  }

  String get _title => switch (widget.slug) {
        'privacy' => 'Privacy Policy',
        'cancellation' => 'Cancellation Policy',
        _ => 'Terms of Service',
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_title)),
      body: Stack(
        children: <Widget>[
          WebViewWidget(controller: _controller),
          if (_loading)
            const LinearProgressIndicator(
              color: AppColors.brandRed,
              backgroundColor: AppColors.surfaceAlt,
            ),
        ],
      ),
    );
  }
}
