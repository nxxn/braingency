# A news article, written in every Site::LOCALES language.
#
# Copy is stored per language in plain columns (title_en, title_lv, …). The
# body is plain text: paragraphs are separated by a blank line, which is all
# the formatting the article page has ever needed.
class Article < ApplicationRecord
  SLUG_FORMAT = /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/

  # Interactive articles: the page renders app/views/articles/<key>.html.erb,
  # with its copy in config/locales/articles/<key>.*.yml, instead of the plain
  # body. poll_options is how many positions its reader poll offers (0: none).
  TEMPLATES = {
    "ai_in_mathematics" => { poll_options: 5 }
  }.freeze

  has_many :poll_votes, dependent: :delete_all

  validates :slug, presence: true, uniqueness: true, format: { with: SLUG_FORMAT }
  validates :published_on, :title_en, presence: true
  validates :template, inclusion: { in: TEMPLATES.keys }, allow_blank: true

  normalizes :template, with: ->(value) { value.presence }

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

  def poll_options = TEMPLATES.dig(template, :poll_options).to_i

  # Votes per position, index = choice.
  def poll_counts
    counts = poll_votes.group(:choice).count
    Array.new(poll_options) { |choice| counts.fetch(choice, 0) }
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
