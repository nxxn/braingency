class AddRussianAndTemplatesToArticles < ActiveRecord::Migration[7.2]
  def change
    # Russian joins as a third site language.
    add_column :articles, :title_ru, :string
    add_column :articles, :excerpt_ru, :text
    add_column :articles, :body_ru, :text
    add_column :articles, :meta_title_ru, :string
    add_column :articles, :meta_description_ru, :string

    # An interactive article renders app/views/articles/<template>.html.erb
    # instead of its plain-text body (see Article::TEMPLATES).
    add_column :articles, :template, :string
  end
end
