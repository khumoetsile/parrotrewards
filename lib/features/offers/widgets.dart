import 'package:flutter/material.dart';

import 'models.dart';
import '../../core/api.dart';

IconData categoryIcon(String key) => switch (key) {
  'music' => Icons.music_note_rounded,
  'hardware' => Icons.construction_rounded,
  'auto' => Icons.directions_car_filled_rounded,
  _ => Icons.local_offer_rounded,
};
Color categoryColor(String key) => switch (key) {
  'music' => const Color(0xff493bc5),
  'hardware' => const Color(0xffc3741c),
  'auto' => const Color(0xff216178),
  _ => const Color(0xff15724b),
};

class OfferArt extends StatelessWidget {
  final String kind;
  final bool isSample;
  const OfferArt(this.kind, {super.key, this.isSample = false});
  @override
  Widget build(BuildContext context) {
    final color = categoryColor(kind);
    return AspectRatio(
      aspectRatio: 8 / 5,
      child: ClipRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [color, color.withValues(alpha: .65)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            Positioned(
              right: -20,
              top: -45,
              child: Container(
                width: 190,
                height: 190,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: .18),
                    width: 30,
                  ),
                ),
              ),
            ),
            if (kind.startsWith('upload-'))
              Image.network(
                '$apiUrl/offer-images/$kind',
                fit: BoxFit.contain,
                semanticLabel: 'Offer image',
                errorBuilder: (_, _, _) => const ColoredBox(
                  color: Color(0xffe8efea),
                  child: Center(
                    child: Icon(
                      Icons.image_not_supported_outlined,
                      size: 42,
                      color: Color(0xff63756a),
                    ),
                  ),
                ),
              ),
            if (!kind.startsWith('upload-'))
              Positioned(
                left: 14,
                right: 14,
                bottom: 14,
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: OfferArtworkCaption(
                    kind == 'music'
                        ? 'TURN UP THE POSSIBILITIES'
                        : kind == 'hardware'
                        ? 'BUILD SOMETHING GOOD'
                        : kind.startsWith('upload-')
                        ? 'MORE VALUE. MORE POSSIBILITIES.'
                        : 'KEEP MOVING',
                  ),
                ),
              ),
            if (isSample)
              const Positioned(
                top: 13,
                left: 14,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.all(Radius.circular(7)),
                  ),
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Text(
                      'Sample offer',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        color: Color(0xff173c2e),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class OfferCard extends StatelessWidget {
  final PromotionOffer offer;
  final VoidCallback onTap;
  const OfferCard({super.key, required this.offer, required this.onTap});
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 20),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          OfferArt(offer.imageKey, isSample: offer.isDemo),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        offer.category.toUpperCase(),
                        style: TextStyle(
                          color: categoryColor(offer.imageKey),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                    if (offer.discountPercent != null)
                      Chip(
                        label: Text(
                          '${offer.discountPercent}% OFF',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
                if (offer.provider.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.storefront_outlined,
                          size: 14,
                          color: Color(0xff63755e),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            offer.provider,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xff7e8f74),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  offer.title,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                OfferPrices(
                  originalPrice: offer.originalPrice,
                  discountedPrice: offer.price,
                ),
                if (offer.savings != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Text(
                      'Save BWP ${displayPrice(offer.savings!)}',
                      style: const TextStyle(
                        color: Color(0xff15724b),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                const SizedBox(height: 15),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'View offer',
                        style: const TextStyle(
                          color: Color(0xff15724b),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      color: Color(0xff15724b),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class OfferPrices extends StatelessWidget {
  final String? originalPrice;
  final String discountedPrice;
  const OfferPrices({
    super.key,
    required this.originalPrice,
    required this.discountedPrice,
  });
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 28,
    runSpacing: 12,
    children: [
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Original price',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: const Color(0xff63756a)),
          ),
          const SizedBox(height: 4),
          Text(
            originalPrice == null
                ? 'Not supplied'
                : 'BWP ${displayPrice(originalPrice!)}',
            style: TextStyle(
              fontSize: 18,
              color: const Color(0xff63756a),
              decoration: originalPrice == null
                  ? null
                  : TextDecoration.lineThrough,
            ),
          ),
        ],
      ),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Price after discount',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: const Color(0xff15724b)),
          ),
          const SizedBox(height: 4),
          Text(
            'BWP ${displayPrice(discountedPrice)}',
            style: const TextStyle(
              fontSize: 27,
              fontWeight: FontWeight.w900,
              color: Color(0xff173c2e),
            ),
          ),
        ],
      ),
    ],
  );
}

/// Opaque backing keeps image text legible independently of photo brightness.
class OfferArtworkCaption extends StatelessWidget {
  static const background = Color(0xff102e24);
  static const foreground = Colors.white;
  final String text;
  const OfferArtworkCaption(this.text, {super.key});
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      child: Text(
        text,
        style: const TextStyle(
          color: foreground,
          fontSize: 14,
          fontWeight: FontWeight.w800,
          height: 1.25,
          letterSpacing: .4,
        ),
      ),
    ),
  );
}
