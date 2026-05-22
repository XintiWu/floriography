-- 為花卡推特中尚未命名的範例卡片補上 card_title（與前台 sampleCards 標題一致）
WITH titles AS (
  SELECT *
  FROM unnest(ARRAY[
    '春日拾光', '晨光祝禱', '靜靜想你', '溫暖同行', '無盡優雅',
    '自由之風', '永恆守候', '初夏生機', '純真年代', '勇敢前行',
    '寧靜之森', '秋日思念', '熱情夏日', '星夜呢喃', '守護天使'
  ]) WITH ORDINALITY AS t(title, ord)
),
numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM shared_cards
  WHERE card_title IS NULL OR trim(card_title) = ''
)
UPDATE shared_cards sc
SET card_title = t.title
FROM numbered n
JOIN titles t ON t.ord = ((n.rn - 1) % 15) + 1
WHERE sc.id = n.id;
