import 'dart:async';

import 'package:flutter/material.dart';

/// Type-ahead search shared by discovery and personal lists.
class LiveSearchField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final VoidCallback onSearch;
  const LiveSearchField({
    super.key,
    required this.controller,
    required this.hint,
    required this.onSearch,
  });
  @override
  State<LiveSearchField> createState() => _LiveSearchFieldState();
}

class _LiveSearchFieldState extends State<LiveSearchField> {
  Timer? timer;
  void changed(String value) {
    setState(() {});
    timer?.cancel();
    timer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) widget.onSearch();
    });
  }

  void search() {
    timer?.cancel();
    widget.onSearch();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: widget.controller,
    maxLength: 100,
    textInputAction: TextInputAction.search,
    onChanged: changed,
    onSubmitted: (_) => search(),
    decoration: InputDecoration(
      hintText: widget.hint,
      counterText: '',
      prefixIcon: const Icon(Icons.search),
      suffixIcon: widget.controller.text.isEmpty
          ? null
          : IconButton(
              tooltip: 'Clear search',
              icon: const Icon(Icons.close),
              onPressed: () {
                widget.controller.clear();
                setState(() {});
                search();
              },
            ),
    ),
  );
}

class ChoiceOption {
  final String value, label;
  const ChoiceOption(this.value, this.label);
}

class SearchableChoice extends StatelessWidget {
  final List<ChoiceOption> options;
  final String value, label;
  final ValueChanged<String> onChanged;
  const SearchableChoice({
    super.key,
    required this.options,
    required this.value,
    required this.label,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    final selected = options
        .where((option) => option.value == value)
        .firstOrNull;
    return OutlinedButton.icon(
      icon: const Icon(Icons.filter_list_rounded),
      label: Text(selected?.label ?? label),
      onPressed: () async {
        final result = await showModalBottomSheet<String>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) =>
              _ChoiceSheet(options: options, value: value, label: label),
        );
        if (context.mounted && result != null) onChanged(result);
      },
    );
  }
}

class _ChoiceSheet extends StatefulWidget {
  final List<ChoiceOption> options;
  final String value, label;
  const _ChoiceSheet({
    required this.options,
    required this.value,
    required this.label,
  });
  @override
  State<_ChoiceSheet> createState() => _ChoiceSheetState();
}

class _ChoiceSheetState extends State<_ChoiceSheet> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    final options = widget.options
        .where(
          (option) =>
              option.label.toLowerCase().contains(query.trim().toLowerCase()),
        )
        .toList();
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .75,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          12,
          20,
          MediaQuery.viewInsetsOf(context).bottom + 16,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.label,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                IconButton(
                  tooltip: 'Close selector',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            TextField(
              autofocus: true,
              onChanged: (value) => setState(() => query = value),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Type to find an option',
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: options.isEmpty
                  ? const Center(
                      child: Text('No matching options. Try another search.'),
                    )
                  : ListView.builder(
                      itemCount: options.length,
                      itemBuilder: (context, index) {
                        final option = options[index];
                        return ListTile(
                          title: Text(option.label),
                          trailing: option.value == widget.value
                              ? const Icon(
                                  Icons.check,
                                  color: Color(0xff16755d),
                                )
                              : null,
                          onTap: () => Navigator.pop(context, option.value),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
