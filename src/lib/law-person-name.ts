/** 人名识别也用于错题统计，不依赖出题器或混淆词库。 */
const SURNAMES = "商李韩萧曹刘张王赵陈杨沈薛吴郑孙马董房杜魏白宋柳窦裴郭姚袁谢管仲庄孟荀墨贾秦汉隋唐宋明";
const ROYAL_TITLE = /(文帝|武帝|太宗|高宗|太祖|高祖|玄宗|明皇|始皇|景帝|成祖|圣德|神宗|英宗)$/;

export function looksLikePerson(name: string): boolean {
  if (ROYAL_TITLE.test(name)) return true;
  // 4 字以上几乎都是制度/文献名，不做单字姓联想。
  if (name.length > 3) return false;
  return name.length >= 2 && name.length <= 3 && SURNAMES.includes(name[0]);
}
