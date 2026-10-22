import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, bounds) {
          final desktop = bounds.maxWidth >= 900;
          final compact = bounds.maxWidth < 600;
          final intro = Container(
            padding: EdgeInsets.all(compact ? 26 : 44),
            decoration: BoxDecoration(
              color: const Color(0xff123f32),
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.flutter_dash,
                  color: Color(0xffdcedb9),
                  size: 58,
                ),
                const SizedBox(height: 28),
                Text(
                  'More experiences.\nBetter discounts.',
                  style: TextStyle(
                    fontSize: compact ? 36 : 54,
                    height: 1.08,
                    letterSpacing: -1.8,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                'Discover offers from local providers. Save your discount and enjoy more of what matters to you.',
                  style: TextStyle(
                    fontSize: 17,
                    height: 1.6,
                    color: Color(0xffd3e1d8),
                  ),
                ),
                const SizedBox(height: 30),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xffdcedb9),
                    foregroundColor: const Color(0xff123f32),
                    minimumSize: const Size(180, 52),
                  ),
                  onPressed: () => context.go('/register'),
                  child: const Text('Get started'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  style: TextButton.styleFrom(foregroundColor: Colors.white),
                  onPressed: () => context.go('/login'),
                  child: const Text('Already a member? Sign in'),
                ),
              ],
            ),
          );
          const steps = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'A little more rewarding.',
                style: TextStyle(
                  fontSize: 30,
                  height: 1.2,
                  fontWeight: FontWeight.w800,
                  color: Color(0xff123f32),
                ),
              ),
              SizedBox(height: 12),
              Text(
                'Your next good find starts here.',
                style: TextStyle(fontSize: 17),
              ),
              SizedBox(height: 28),
              _Step(
                number: '01',
                icon: Icons.explore_outlined,
                title: 'Find your offer',
                description: 'Explore published offers and check the pricing, provider and conditions.',
              ),
              _Step(
                number: '02',
                icon: Icons.confirmation_number_outlined,
                title: 'Save your discount',
                description: 'Your claim reference stays in My Claims, ready when you need it.',
              ),
              _Step(
                number: '03',
                icon: Icons.verified_outlined,
                title: 'Redeem with the provider',
                description: 'Present your reference so the provider can validate your discount.',
              ),
            ],
          );
          return SingleChildScrollView(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1240),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: compact ? 20 : 40,
                    vertical: 24,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.flutter_dash,
                            color: Color(0xff16755d),
                            size: 30,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Parrot Rewards',
                              style: TextStyle(
                                fontSize: 23,
                                fontWeight: FontWeight.w800,
                                color: Color(0xff123f32),
                              ),
                            ),
                          ),
                          if (!compact)
                            TextButton(
                              onPressed: () => context.go('/login'),
                              child: const Text('Sign in'),
                            ),
                        ],
                      ),
                      SizedBox(height: compact ? 28 : 48),
                      if (desktop)
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(flex: 6, child: intro),
                            const SizedBox(width: 48),
                            const Expanded(flex: 5, child: steps),
                          ],
                        )
                      else ...[
                        intro,
                        const SizedBox(height: 36),
                        steps,
                      ],
                      const SizedBox(height: 28),
                      const Text(
                        'Save a discount, then present your claim to the provider. A claim does not confirm payment or admission.',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.6,
                          color: Color(0xff63756a),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    ),
  );
}

class _Step extends StatelessWidget {
  final String number, title, description;
  final IconData icon;
  const _Step({
    required this.number,
    required this.icon,
    required this.title,
    required this.description,
  });
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xffe3edda),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: const Color(0xff16755d)),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$number  $title',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(description, style: const TextStyle(height: 1.55)),
            ],
          ),
        ),
      ],
    ),
  );
}
