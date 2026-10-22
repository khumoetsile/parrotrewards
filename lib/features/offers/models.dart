class PromotionOffer {
  final String id,
      slug,
      title,
      description,
      category,
      categorySlug,
      imageKey,
      terms,
      action;
  final String price;
  final String provider;
  final String? originalPrice, savings;
  final int? discountPercent;
  final bool isDemo;
  PromotionOffer.fromJson(Map<String, dynamic> json)
    : id = json['id'],
      slug = json['slug'],
      title = json['title'],
      description = json['description'],
      category = json['category']['name'],
      categorySlug = json['category']['slug'],
      imageKey = json['imageKey'],
      terms = json['terms'] ?? 'Confirm redemption with the provider.',
      action = json['claimAction'] ?? 'Claim Discount',
      price = json['discountedPrice'],
      provider = json['merchant']?['name'] ?? '',
      originalPrice = json['originalPrice'],
      savings = json['savings'],
      discountPercent = json['discountPercent'],
      isDemo = json['isDemo'];
  String get priceLabel => 'BWP ${displayPrice(price)}';
}

String displayPrice(String value) =>
    value.endsWith('.00') ? value.substring(0, value.length - 3) : value;

String customerTerms(String value) => value
    .replaceAll(
      'DEMO ONLY. Prototype example, not a confirmed live offer or partnership.',
      'Sample offer. Provider participation and availability are not confirmed.',
    )
    .replaceAll('for prototype validation', 'for validation')
    .replaceAll('DEMO ONLY.', 'Sample offer.')
    .replaceAll(
      'Prototype example, not a live commercial offer.',
      'Provider participation and availability are not confirmed.',
    );
