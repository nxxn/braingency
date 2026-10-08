module ArticlesHelper
  # Copy for interactive articles comes from config/locales/articles, which is
  # authored in this repository and carries inline <strong>/<em> markup.
  def rich(text) = text.to_s.html_safe

  # CLDR plural category for the integer n, for the site's three languages
  # (no rails-i18n here). The browser mirrors this with Intl.PluralRules.
  def plural_category(n)
    case I18n.locale
    when :ru
      if n % 10 == 1 && n % 100 != 11 then :one
      elsif (2..4).cover?(n % 10) && !(12..14).cover?(n % 100) then :few
      else :many
      end
    when :lv
      n % 10 == 1 && n % 100 != 11 ? :one : :other
    else
      n == 1 ? :one : :other
    end
  end

  # forms: { one:, few:, many:, other: } with %{count}.
  def pluralize_with(forms, n)
    format(forms.fetch(plural_category(n)) { forms.fetch(:other) }, count: n)
  end

  def localized_number(n)
    number_with_delimiter(n, delimiter: I18n.locale == :en ? "," : " ")
  end
end
