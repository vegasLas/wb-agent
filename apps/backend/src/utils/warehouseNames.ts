/**
 * Utility for warehouse name operations and mappings
 * Migrated from deprecated project utils/warehouseNames.ts
 */

// Current list of correct Russian warehouse names
const warehouseNames: string[] = [
  'Алматы Атакент',
  'Астана',
  'Астана 2',
  'Белые Столбы',
  'Владимир Воршинское',
  'Внуково СГТ',
  'Волгоград',
  'Воронеж',
  'Воронеж СГТ',
  'Голицыно СГТ',
  'Екатеринбург - Испытателей 14г',
  'Екатеринбург - Перспективная 14',
  'Екатеринбург - Перспективный 12/2',
  'Казань',
  'Коледино',
  'Котовск',
  'Краснодар',
  'Краснодар (Тихорецкая)',
  'Кузнецк СГТ',
  'Невинномысск',
  'Новосемейкино',
  'Новосибирск',
  'Новосибирск СГТ',
  'Обухово',
  'Обухово СГТ',
  'Подольск',
  'Подольск 3',
  'Подольск 4',
  'Радумля СГТ',
  'Рязань (Тюшевское)',
  'СПБ Шушары',
  'СЦ Абакан',
  'СЦ Абакан 2',
  'СЦ Актобе',
  'СЦ Артем',
  'СЦ Архангельск (ул Ленина)',
  'СЦ Астрахань',
  'СЦ Астрахань (Солянка)',
  'СЦ Байсерке',
  'СЦ Барнаул',
  'СЦ Белая Дача',
  'СЦ Белогорск',
  'СЦ Бишкек',
  'СЦ Брест',
  'СЦ Видное',
  'СЦ Владикавказ',
  'СЦ Владимир',
  'СЦ Внуково',
  'СЦ Вологда',
  'СЦ Вологда 2',
  'СЦ Воронеж',
  'СЦ Вёшки',
  'СЦ Гродно',
  'СЦ Ереван',
  'СЦ Иваново',
  'СЦ Ижевск',
  'СЦ Иркутск',
  'СЦ Калуга',
  'СЦ Кемерово',
  'СЦ Киров',
  'СЦ Крыловская',
  'СЦ Кузнецк',
  'СЦ Курск',
  'СЦ Липецк',
  'СЦ Махачкала',
  'СЦ Минск',
  'СЦ Мурманск',
  'СЦ Набережные Челны',
  'СЦ Нижний Новгород',
  'СЦ Нижний Тагил',
  'СЦ Новокузнецк',
  'СЦ Новосибирск Пасечная',
  'СЦ Ноябрьск',
  'СЦ Обухово 2',
  'СЦ Омск',
  'СЦ Оренбург Центральная',
  'СЦ Ош',
  'СЦ Пермь 2',
  'СЦ Псков',
  'СЦ Пушкино',
  'СЦ Пятигорск',
  'СЦ Пятигорск (Этока)',
  'СЦ Ростов-на-Дону',
  'СЦ Сабурово',
  'СЦ Самара',
  'СЦ Семей',
  'СЦ Серов',
  'СЦ Симферополь Молодежненское',
  'СЦ Смоленск 3',
  'СЦ Софьино',
  'СЦ Сургут',
  'СЦ Сыктывкар',
  'СЦ Тамбов',
  'СЦ Тверь',
  'СЦ Томск',
  'СЦ Тюмень',
  'СЦ Ульяновск',
  'СЦ Уральск',
  'СЦ Уфа',
  'СЦ Хабаровск',
  'СЦ Чебоксары 2',
  'СЦ Челябинск 2',
  'СЦ Череповец',
  'СЦ Чита 2',
  'СЦ Шушары',
  'СЦ Шымкент',
  'СЦ Ярославль',
  'СЦ Ярославль Громова',
  'Самара (Новосемейкино)',
  'Санкт-Петербург (Уткина Заводь)',
  'Санкт-Петербург СГТ',
  'Сарапул',
  'Склад Шушары',
  'Софрино СГТ',
  'Софьино СГТ',
  'Сц Брянск 2',
  'Тула',
  'Чашниково',
  'Челябинск СГТ',
  'Чехов 1, Новоселки вл 11 стр 2',
  'Чехов 2, Новоселки вл 11 стр 7',
  'Шушары СГТ',
  'Щербинка',
  'Электросталь',
  'Ярославль СГТ',
];

// Mapping from Latin (English) keys to Russian warehouse names
const warehouseNameMap: Record<string, string> = {
  'Almaty Atakent': 'Алматы Атакент',
  Astana: 'Астана',
  'Astana 2': 'Астана 2',
  'Belye Stolby': 'Белые Столбы',
  'Vladimir Vorshinskoe': 'Владимир Воршинское',
  'Vnukovo SGT': 'Внуково СГТ',
  Volgograd: 'Волгоград',
  Voronezh: 'Воронеж',
  'Voronezh SGT': 'Воронеж СГТ',
  'Golitsyno SGT': 'Голицыно СГТ',
  'Ekaterinburg - Ispytateley 14g': 'Екатеринбург - Испытателей 14г',
  'Ekaterinburg - Perspektivnaya 14': 'Екатеринбург - Перспективная 14',
  'Ekaterinburg 2 - Perspektivnaya 14': 'Екатеринбург - Перспективный 12/2',
  Kazan: 'Казань',
  Koledino: 'Коледино',
  Kotovsk: 'Котовск',
  'Krasnodar Tikhoretskaya': 'Краснодар (Тихорецкая)',
  'Kuznets SGT': 'Кузнецк СГТ',
  Nevinnomyssk: 'Невинномысск',
  Novosemeykinо: 'Новосемейкино',
  Novosibirsk: 'Новосибирск',
  'Novosibirsk SGT': 'Новосибирск СГТ',
  Obukhovo: 'Обухово',
  'Obukhovo SGT': 'Обухово СГТ',
  Podolsk: 'Подольск',
  'Podolsk 3': 'Подольск 3',
  'Podolsk 4': 'Подольск 4',
  'Radumlya SGT': 'Радумля СГТ',
  'Ryazan Tyushevskoe': 'Рязань (Тюшевское)',
  Abakan: 'СЦ Абакан',
  'Abakan 2': 'СЦ Абакан 2',
  Aktobe: 'СЦ Актобе',
  Artem: 'СЦ Артем',
  'Arkhangelsk ul Lenina': 'СЦ Архангельск (ул Ленина)',
  Astrakhan: 'СЦ Астрахань',
  'Astrakhan Solyanka': 'СЦ Астрахань (Солянка)',
  Bayserke: 'СЦ Байсерке',
  Barnaul: 'СЦ Барнаул',
  'Belaya Dacha': 'СЦ Белая Дача',
  Sarapyl: 'Сарапул',
  Belogorsk: 'СЦ Белогорск',
  Bishkek: 'СЦ Бишкек',
  Brest: 'СЦ Брест',
  Vidnoe: 'СЦ Видное',
  Vladikavkaz: 'СЦ Владикавказ',
  Vladimir: 'СЦ Владимир',
  Vnukovo: 'СЦ Внуково',
  Vologda: 'СЦ Вологда',
  'Vologda 2': 'СЦ Вологда 2',
  Vyoshki: 'СЦ Вёшки',
  Grodno: 'СЦ Гродно',
  Yerevan: 'СЦ Ереван',
  Ivanovo: 'СЦ Иваново',
  Izhevsk: 'СЦ Ижевск',
  Irkutsk: 'СЦ Иркутск',
  Kaluga: 'СЦ Калуга',
  Kemerovo: 'СЦ Кемерово',
  Kirov: 'СЦ Киров',
  Krylovskaya: 'СЦ Крыловская',
  Kuznets: 'СЦ Кузнецк',
  Kursk: 'СЦ Курск',
  Lipetsk: 'СЦ Липецк',
  Makhachkala: 'СЦ Махачкала',
  Minsk: 'СЦ Минск',
  Murmansk: 'СЦ Мурманск',
  'Naberezhnye Chelny': 'СЦ Набережные Челны',
  'Nizhny Novgorod': 'СЦ Нижний Новгород',
  'Nizhny Tagil': 'СЦ Нижний Тагил',
  Novokuznetsk: 'СЦ Новокузнецк',
  'Novosibirsk Pasechnaya': 'СЦ Новосибирск Пасечная',
  Noyabrsk: 'СЦ Ноябрьск',
  'Obukhovo 2': 'СЦ Обухово 2',
  Omsk: 'СЦ Омск',
  'Orenburg Tsentralnaya': 'СЦ Оренбург Центральная',
  Osh: 'СЦ Ош',
  'Perm 2': 'СЦ Пермь 2',
  Pskov: 'СЦ Псков',
  Pushkino: 'СЦ Пушкино',
  Pyatigorsk: 'СЦ Пятигорск',
  'Pyatigorsk Etoka': 'СЦ Пятигорск (Этока)',
  'Rostov-on-Don': 'СЦ Ростов-на-Дону',
  Saburovo: 'СЦ Сабурово',
  Samara: 'СЦ Самара',
  Semey: 'СЦ Семей',
  Serov: 'СЦ Серов',
  'Simferopol Molodezhenskoe': 'СЦ Симферополь Молодежненское',
  'Smolensk 3': 'СЦ Смоленск 3',
  Sofyino: 'СЦ Софьино',
  Surgut: 'СЦ Сургут',
  Syktyvkar: 'СЦ Сыктывкар',
  Tambov: 'СЦ Тамбов',
  Tver: 'СЦ Тверь',
  Tomsk: 'СЦ Томск',
  Tyumen: 'СЦ Тюмень',
  Ulyanovsk: 'СЦ Ульяновск',
  Uralsk: 'СЦ Уральск',
  Ufa: 'СЦ Уфа',
  Chabarovsk: 'СЦ Хабаровск',
  'Cheboksary 2': 'СЦ Чебоксары 2',
  'Chelyabinsk 2': 'СЦ Челябинск 2',
  Cherepovets: 'СЦ Череповец',
  'Chita 2': 'СЦ Чита 2',
  Shushary: 'СЦ Шушары',
  Shymkent: 'СЦ Шымкент',
  Yaroslavl: 'СЦ Ярославль',
  'Yaroslavl Gromova': 'СЦ Ярославль Громова',
  'Saint Petersburg Utkina Zavod': 'Санкт-Петербург (Уткина Заводь)',
  'Saint Petersburg SGT': 'Санкт-Петербург СГТ',
  Sarapul: 'Сарапул',
  'SPB Shushary': 'СПБ Шушары',
  'Sofrino SGT': 'Софрино СГТ',
  'Sofyino SGT': 'Софьино СГТ',
  'Samara Novosemeykino': 'Самара (Новосемейкино)',
  'Bryansk 2': 'Сц Брянск 2',
  Tula: 'Тула',
  Chashnikovo: 'Чашниково',
  'Chelyabinsk SGT': 'Челябинск СГТ',
  'Chekhov 1 Novoselki vl 11 str 2': 'Чехов 1, Новоселки вл 11 стр 2',
  'Chekhov 2 Novoselki vl 11 str 7': 'Чехов 2, Новоселки вл 11 стр 7',
  'Shushary SGT': 'Шушары СГТ',
  Shcherbinka: 'Щербинка',
  Elektrostal: 'Электросталь',
  'Yaroslavl SGT': 'Ярославль СГТ',
  // Legacy mappings for backward compatibility
  'Saint Petersburg, Utkina Zavod': 'Санкт-Петербург (Уткина Заводь)',
  'Samara (Novosemeykino)': 'Новосемейкино',
  Krasnodar: 'Краснодар (Тихорецкая)',
  Ryazan: 'Рязань (Тюшевское)',
  Atakent: 'Алматы Атакент',
  Other: 'Другой',
};

// Build a set of all known Russian names for fast lookup
const allRussianNames = new Set([
  ...warehouseNames,
  ...Object.values(warehouseNameMap),
]);

/**
 * Converts English warehouse name to Russian equivalent
 * @param englishName - The English warehouse name
 * @returns Russian warehouse name or original if no mapping found
 */
export function convertWarehouseName(englishName: string): string {
  if (!englishName) return '';

  // Trim whitespace and check direct mapping
  const trimmedName = englishName.trim();

  // If already a known Russian name, return as-is
  if (allRussianNames.has(trimmedName)) {
    return trimmedName;
  }

  const russianName = warehouseNameMap[trimmedName];

  if (russianName) {
    return russianName;
  }

  // Try case-insensitive search
  const lowerName = trimmedName.toLowerCase();
  for (const [english, russian] of Object.entries(warehouseNameMap)) {
    if (english.toLowerCase() === lowerName) {
      return russian;
    }
  }

  // If no mapping found, return original name
  console.warn(`No Russian mapping found for warehouse: "${englishName}"`);
  return englishName;
}

/**
 * Converts an array of warehouse names to Russian
 * @param warehouseNames - Array of English warehouse names
 * @returns Array of Russian warehouse names
 */
export function convertWarehouseNames(warehouseNames: string[]): string[] {
  return warehouseNames.map((name) => convertWarehouseName(name));
}

/**
 * Gets the current list of valid warehouse names
 * @returns Array of valid warehouse names
 */
export function getValidWarehouseNames(): string[] {
  return [...warehouseNames];
}

/**
 * Checks if a warehouse name is in the valid list
 * @param name - Warehouse name to check
 * @returns true if warehouse name is valid
 */
export function isValidWarehouseName(name: string): boolean {
  if (!name) return false;
  return warehouseNames.includes(name.trim());
}

/**
 * Gets all available warehouse mappings
 * @returns Object with English->Russian mappings
 */
export function getWarehouseMappings(): Record<string, string> {
  return { ...warehouseNameMap };
}

/**
 * Checks if a warehouse name has a Russian mapping
 * @param englishName - The English warehouse name
 * @returns true if mapping exists
 */
export function hasWarehouseMapping(englishName: string): boolean {
  if (!englishName) return false;

  const trimmedName = englishName.trim();
  return (
    Object.prototype.hasOwnProperty.call(warehouseNameMap, trimmedName) ||
    Object.keys(warehouseNameMap).some(
      (key) => key.toLowerCase() === trimmedName.toLowerCase(),
    )
  );
}
