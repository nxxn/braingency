# A news article, written in every Site::LOCALES language.
#
# Copy is stored per language in plain columns (title_en, title_lv, …). The
# body is plain text: paragraphs are separated by a blank line, which is all
# the formatting the article page has ever needed.
class Article < ApplicationRecord
  SLUG_FORMAT = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

  validates :slug, presence: true, uniqueness: true, format: { with: SLUG_FORMAT }
  validates :published_on, :title_en, presence: true

  scope :published, -> { where(published: true) }
  scope :newest_first, -> { order(published_on: :desc, id: :desc) }

  # What the sitemap and JSON-LD report as the last change.
  def modified_on = [published_on, updated_at&.to_date].compact.max

  def title = localized(:title)
  def excerpt = localized(:excerpt)
  def meta_title = localized(:meta_title).presence || "#{title} — #{Site::BRAND}"
  def meta_description = localized(:meta_description).presence || excerpt

  def paragraphs
    localized(:body).to_s.split(/\r?\n\s*\r?\n/).map(&:strip).reject(&:empty?)
  end

  # Key of the pre-rendered Open Graph card in public/og/ (see bin/build-brand).
  def og_key = :"article_#{slug.tr('-', '_')}"

  private

  # Current locale first, then the default one, so a half-translated article
  # still renders instead of showing blanks.
  def localized(field)
    [I18n.locale, Site::DEFAULT_LOCALE].uniq
      .map { |locale| self[:"#{field}_#{locale}"] }
      .find(&:present?)
  end
end
