import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_application_1/core/search.dart';
import 'package:flutter_application_1/core/api.dart';
import 'package:flutter_application_1/features/offers/discovery.dart';

class SearchApi extends Api {
  final queries = <String>[];
  @override
  Future<dynamic> get(String path) async {
    queries.add(path);
    if (path == '/categories') {
      return [
        {'name': 'Hardware', 'slug': 'hardware'},
      ];
    }
    return <dynamic>[];
  }
}

void main() {
  testWidgets(
    'live search waits briefly while typing, then searches without a button',
    (tester) async {
      final controller = TextEditingController();
      addTearDown(controller.dispose);
      var calls = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LiveSearchField(
              controller: controller,
              hint: 'Find offers',
              onSearch: () => calls++,
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'spa');
      await tester.pump(const Duration(milliseconds: 150));
      await tester.enterText(find.byType(TextField), 'spade');
      await tester.pump(const Duration(milliseconds: 299));
      expect(calls, 0);
      await tester.pump(const Duration(milliseconds: 1));
      expect(calls, 1);
      await tester.tap(find.byTooltip('Clear search'));
      await tester.pump();
      expect(controller.text, '');
      expect(calls, 2);
    },
  );
  testWidgets('category selector searches and returns a choice', (
    tester,
  ) async {
    var selected = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SearchableChoice(
            label: 'Categories',
            value: '',
            options: const [
              ChoiceOption('hardware', 'Hardware'),
              ChoiceOption('music', 'Music'),
            ],
            onChanged: (value) => selected = value,
          ),
        ),
      ),
    );
    await tester.tap(find.byType(OutlinedButton));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'hard');
    await tester.pump();
    expect(find.text('Music'), findsNothing);
    await tester.tap(find.text('Hardware'));
    await tester.pumpAndSettle();
    expect(selected, 'hardware');
    expect(tester.takeException(), isNull);
  });
  testWidgets('mobile offer discovery sends a live encoded query', (
    tester,
  ) async {
    final api = SearchApi();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiProvider.overrideWithValue(api)],
        child: const MaterialApp(home: DiscoverOffersScreen()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'spade & shovel');
    await tester.pump(const Duration(milliseconds: 310));
    await tester.pumpAndSettle();
    expect(
      api.queries.any(
        (query) =>
            Uri.parse(query).queryParameters['search'] == 'spade & shovel',
      ),
      isTrue,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets('leaving a search cancels a pending callback', (tester) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LiveSearchField(
            controller: controller,
            hint: 'Find',
            onSearch: () => calls++,
          ),
        ),
      ),
    );
    await tester.enterText(find.byType(TextField), 'test');
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 1));
    expect(calls, 0);
  });
}
