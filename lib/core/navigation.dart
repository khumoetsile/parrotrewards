import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Native tab navigation keeps each section's search, scroll and detail stack.
class AppNavigation extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const AppNavigation({super.key, required this.navigationShell});
  void select(int index) {
    if (index != navigationShell.currentIndex) navigationShell.goBranch(index);
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, bounds) {
      final wide = bounds.maxWidth >= 760;
      return Scaffold(
        body: wide
            ? Row(
                children: [
                  SafeArea(
                    child: NavigationRail(
                      extended: bounds.maxWidth >= 1200,
                      selectedIndex: navigationShell.currentIndex,
                      onDestinationSelected: select,
                      labelType: bounds.maxWidth >= 1200
                          ? NavigationRailLabelType.none
                          : NavigationRailLabelType.all,
                      destinations: const [
                        NavigationRailDestination(
                          icon: Icon(Icons.explore_outlined),
                          selectedIcon: Icon(Icons.explore),
                          label: Text('Discover'),
                        ),
                        NavigationRailDestination(
                          icon: Icon(Icons.confirmation_number_outlined),
                          label: Text('My Claims'),
                        ),
                        NavigationRailDestination(
                          icon: Icon(Icons.notifications_none),
                          label: Text('Updates'),
                        ),
                        NavigationRailDestination(
                          icon: Icon(Icons.person_outline),
                          label: Text('Account'),
                        ),
                      ],
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1120),
                        child: navigationShell,
                      ),
                    ),
                  ),
                ],
              )
            : navigationShell,
        bottomNavigationBar: wide
            ? null
            : NavigationBar(
                selectedIndex: navigationShell.currentIndex,
                onDestinationSelected: select,
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.explore_outlined),
                    selectedIcon: Icon(Icons.explore),
                    label: 'Discover',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.confirmation_number_outlined),
                    selectedIcon: Icon(Icons.confirmation_number),
                    label: 'My Claims',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.notifications_none),
                    selectedIcon: Icon(Icons.notifications),
                    label: 'Updates',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.person_outline),
                    selectedIcon: Icon(Icons.person),
                    label: 'Account',
                  ),
                ],
              ),
      );
    },
  );
}

void goBack(BuildContext context, String fallback) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(fallback);
  }
}
