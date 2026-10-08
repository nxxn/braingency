class CreateArticles < ActiveRecord::Migration[7.2]
  def change
    create_table :articles do |t|
      t.string :slug, null: false
      t.date :published_on, null: false
      t.boolean :published, null: false, default: false

      # One column per language rather than a translations table: the site
      # has exactly two locales and every article is written in both.
      t.string :title_en, null: false
      t.string :title_lv
      t.text :excerpt_en
      t.text :excerpt_lv
      t.text :body_en
      t.text :body_lv

      # <title> and meta description; fall back to title and excerpt.
      t.string :meta_title_en
      t.string :meta_title_lv
      t.string :meta_description_en
      t.string :meta_description_lv

      t.timestamps
    end

    add_index :articles, :slug, unique: true
    add_index :articles, [:published, :published_on]
  end
end
