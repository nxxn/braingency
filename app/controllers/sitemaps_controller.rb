class SitemapsController < ApplicationController
  # Built from Site::PAGES + Site::ARTICLES, so it can never drift out of sync
  # with the routes. URLs are composed from Site::HOST rather than the request,
  # so a sitemap fetched over the Heroku hostname still advertises the canonical
  # domain.
  #
  # Each URL lists its siblings in every language (plus x-default), the same
  # set the page's own hreflang tags declare, so Google pairs EN and LV
  # versions from either source.
  def show
    @entries = Site::LOCALES.flat_map do |locale|
      pages = Site::PAGES.map do |page|
        { loc: absolute(path_for_page(page, locale)), priority: page.priority, changefreq: "monthly",
          alternates: alternates { |l| path_for_page(page, l) } }
      end

      articles = Site::ARTICLES.map do |article|
        { loc: absolute(article_path(slug: article.slug, locale: locale)),
          priority: 0.5, changefreq: "yearly", lastmod: article.published_on,
          alternates: alternates { |l| article_path(slug: article.slug, locale: l) } }
      end

      pages + articles
    end

    render formats: :xml
  end

  private

  def absolute(path) = "#{Site::HOST}#{path}"

  def alternates
    links = Site::LOCALES.to_h { |l| [l.to_s, absolute(yield(l))] }
    links.merge("x-default" => links[Site::DEFAULT_LOCALE.to_s])
  end

  def path_for_page(page, locale)
    if page.root?
      locale_root_path(locale: locale)
    else
      public_send("#{page.key}_path", locale: locale)
    end
  end
end
