import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models/cart_item.dart';
import '../data/models/product.dart';

/// Local-first cart. Persists to SharedPreferences so that closing the app
/// doesn't lose the user's selection. Backed by a [ValueNotifier] so widgets
/// can rebuild reactively without Riverpod boilerplate.
class CartStore extends ChangeNotifier {
  CartStore._();
  static final CartStore instance = CartStore._();

  static const String _key = 'kc_cart_v1';

  final Map<String, CartLine> _lines = <String, CartLine>{};
  bool _loaded = false;

  List<CartLine> get lines => List<CartLine>.unmodifiable(_lines.values);
  int get distinctCount => _lines.length;
  bool get isEmpty => _lines.isEmpty;
  bool get isNotEmpty => _lines.isNotEmpty;

  double get total => _lines.values.fold<double>(
        0,
        (double acc, CartLine l) => acc + (l.price * l.qty),
      );

  int get unitsTotal => _lines.values
      .fold<double>(0, (double acc, CartLine l) => acc + l.qty)
      .toInt();

  Future<void> load() async {
    if (_loaded) return;
    final SharedPreferences sp = await SharedPreferences.getInstance();
    final String? raw = sp.getString(_key);
    if (raw != null && raw.isNotEmpty) {
      try {
        final List<dynamic> parsed = jsonDecode(raw) as List<dynamic>;
        for (final dynamic item in parsed) {
          final CartLine l =
              CartLine.fromJson(Map<String, dynamic>.from(item as Map));
          _lines[l.productId] = l;
        }
      } catch (_) {
        await sp.remove(_key);
      }
    }
    _loaded = true;
  }

  Future<void> _persist() async {
    final SharedPreferences sp = await SharedPreferences.getInstance();
    final String raw = jsonEncode(
      _lines.values.map((CartLine l) => l.toJson()).toList(),
    );
    await sp.setString(_key, raw);
  }

  void addOrIncrement(Product product, {double step = 0.5}) {
    final CartLine? existing = _lines[product.id];
    if (existing == null) {
      _lines[product.id] = CartLine(
        productId: product.id,
        name: product.name,
        unit: product.unit ?? 'kg',
        qty: step,
        price: product.price ?? 0,
        imageUrl: product.imageUrl,
      );
    } else {
      _lines[product.id] = existing.copyWith(qty: existing.qty + step);
    }
    notifyListeners();
    _persist();
  }

  void decrement(String productId, {double step = 0.5}) {
    final CartLine? existing = _lines[productId];
    if (existing == null) return;
    final double newQty = existing.qty - step;
    if (newQty <= 0) {
      _lines.remove(productId);
    } else {
      _lines[productId] = existing.copyWith(qty: newQty);
    }
    notifyListeners();
    _persist();
  }

  void setQty(String productId, double qty) {
    final CartLine? existing = _lines[productId];
    if (existing == null) return;
    if (qty <= 0) {
      _lines.remove(productId);
    } else {
      _lines[productId] = existing.copyWith(qty: qty);
    }
    notifyListeners();
    _persist();
  }

  void remove(String productId) {
    _lines.remove(productId);
    notifyListeners();
    _persist();
  }

  void clear() {
    _lines.clear();
    notifyListeners();
    _persist();
  }

  /// Replace cart with these lines (used by "Reorder").
  void replaceWith(List<CartLine> newLines) {
    _lines
      ..clear()
      ..addEntries(newLines.map((CartLine l) => MapEntry<String, CartLine>(l.productId, l)));
    notifyListeners();
    _persist();
  }

  double? qtyOf(String productId) => _lines[productId]?.qty;
}
