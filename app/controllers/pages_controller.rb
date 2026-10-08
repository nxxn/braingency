class PagesController < ApplicationController
  # Every page in Site::PAGES renders app/views/pages/<action>.html.erb.
  # Page copy lives in config/locales/{en,lv}.yml; only news articles come
  # from the database.

  def home = render_page(:home)
  def about = render_page(:about)
  def product = render_page(:product)
  def ml_lab = render_page(:ml_lab)
  def team = render_page(:team)
  def contact = render_page(:contact)
  def gender_equality_plan = render_page(:gender_equality_plan)

  def news
    @articles = Article.published.newest_first
    render_page(:news)
  end

  def article
    @article = Article.published.find_by(slug: params[:slug]) or
      return render file: Rails.public_path.join("404.html"), status: :not_found, layout: false

    @page_key = @article.og_key
    render :article
  end

  # Development-only logo comparison sheet (see config/routes.rb).
  def brand = render_page(:brand)

  # "/" — pick a locale from the browser, then get out of the way.
  def locale_redirect
    redirect_to locale_root_path(locale: preferred_locale), status: :found
  end

  private

  def render_page(key)
    @page_key = key
    render key
  end

  def preferred_locale
    accepted = request.headers["Accept-Language"].to_s.downcase
    Site::LOCALES.find { |l| accepted.include?(l.to_s) } || Site::DEFAULT_LOCALE
  end
end
