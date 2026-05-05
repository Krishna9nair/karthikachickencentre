import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../app/theme.dart';
import '../../data/models/review.dart';
import '../../data/repositories/reviews_repository.dart';
import 'write_review_dialog.dart';

/// Mirrors the website's `Reviews.jsx` section. Shown on the Home screen
/// after Why-Choose-Us. Shows up to 6 most-recent approved reviews +
/// a "Write a review" CTA that opens [WriteReviewDialog].
class ReviewsSection extends StatefulWidget {
  const ReviewsSection({super.key});
  @override
  State<ReviewsSection> createState() => _ReviewsSectionState();
}

class _ReviewsSectionState extends State<ReviewsSection> {
  List<CustomerReview>? _reviews;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final List<CustomerReview> list = await ReviewsRepository.instance.list();
    if (!mounted) return;
    setState(() => _reviews = list);
  }

  Future<void> _openWriteDialog() async {
    final bool? submitted = await showDialog<bool>(
      context: context,
      builder: (_) => const WriteReviewDialog(),
    );
    if (submitted == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final List<CustomerReview>? reviews = _reviews;
    final double avg = (reviews == null || reviews.isEmpty)
        ? 0
        : reviews.map((CustomerReview r) => r.rating).reduce((int a, int b) => a + b) /
            reviews.length;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      padding: const EdgeInsets.fromLTRB(2, 0, 2, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'CUSTOMER STORIES',
            style: TextStyle(
              fontSize: 11,
              letterSpacing: 2.5,
              fontWeight: FontWeight.w800,
              color: AppColors.brandRed,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: <Widget>[
              Expanded(
                child: Text(
                  'What our customers say',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 38),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                ),
                onPressed: _openWriteDialog,
                icon: const Icon(LucideIcons.messageSquarePlus, size: 16),
                label: const Text('Write'),
              ),
            ],
          ),
          if (reviews != null && reviews.isNotEmpty) ...<Widget>[
            const SizedBox(height: 6),
            Row(
              children: <Widget>[
                _StarRow(n: avg.round()),
                const SizedBox(width: 6),
                Text(avg.toStringAsFixed(1),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(width: 6),
                Text(
                  '· ${reviews.length} review${reviews.length == 1 ? '' : 's'}',
                  style: const TextStyle(color: AppColors.textMuted),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),
          if (reviews == null)
            const SizedBox(
              height: 110,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (reviews.isEmpty)
            _buildEmpty()
          else
            SizedBox(
              height: 188,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: reviews.length > 6 ? 6 : reviews.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (BuildContext c, int i) =>
                    _ReviewCard(review: reviews[i]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border, style: BorderStyle.solid),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: <Widget>[
          const Icon(LucideIcons.quote, color: AppColors.brandRed, size: 30),
          const SizedBox(height: 8),
          const Text('Be the first to review',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 4),
          const Text(
            'Bought from us recently? Share how the chicken tasted.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _openWriteDialog,
            icon: const Icon(LucideIcons.messageSquarePlus, size: 16),
            label: const Text('Write the first review'),
          ),
        ],
      ),
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});
  final CustomerReview review;
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Icon(LucideIcons.quote, size: 20, color: AppColors.brandRed),
          const SizedBox(height: 6),
          Expanded(
            child: Text(
              review.comment,
              maxLines: 5,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(height: 1.4),
            ),
          ),
          const Divider(height: 18),
          Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(review.name,
                        style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(
                      _fmt(review.createdAt),
                      style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textMuted,
                          letterSpacing: 1.2),
                    ),
                  ],
                ),
              ),
              _StarRow(n: review.rating),
            ],
          ),
        ],
      ),
    );
  }

  String _fmt(DateTime d) {
    const List<String> months = <String>[
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    return '${months[d.month - 1]} ${d.year}';
  }
}

class _StarRow extends StatelessWidget {
  const _StarRow({required this.n});
  final int n;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List<Widget>.generate(
        5,
        (int i) => Icon(
          i < n ? Icons.star_rounded : Icons.star_outline_rounded,
          size: 14,
          color: const Color(0xFFF5A623),
        ),
      ),
    );
  }
}
