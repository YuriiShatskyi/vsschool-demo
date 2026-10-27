/* =========================================================
   ВМІСТ САЙТУ VS SCHOOL
   Тут змінюються новини, гуртки та команда.
   Правило: кожен запис у фігурних дужках { ... },
   між записами кома. Текст завжди в лапках "...".
   ========================================================= */

window.SITE = {

  /* ---------- МУЗИКА: плеєр «Співає VS School» ----------
     Файли лежать у папці audio/ поруч з index.html.
     Новий трек: поклади mp3 у audio/ і додай рядок нижче (time — тривалість для треклиста).
     При кожному відкритті сайту плеєр починає з випадкової пісні;
     старт — з плавним наростанням, між піснями — плавний перехід без пауз. */
  music: [
    { title: "Гімн VS School",            artist: "VS School",     src: "audio/track-1.mp3",   time: "1:33" },
    { title: "Вишиття",                   artist: "Надія Яцента",  src: "audio/vyshyttia.mp3", time: "3:08" },
    { title: "Журавлі (муз. О. Білоконь)", artist: "Надія Яцента",  src: "audio/zhuravli.mp3",  time: "4:00" }
  ],
  musicVolume: 0.2,   // стартова гучність: 0.2 = 20%


  /* ---------- НОВИНИ ----------
     Нова новина додається ЗВЕРХУ списку (скопіюйте один блок).
     На головній показуються перші 6.
     img  — шлях до фото на хостингу (папка images/news-page/)
     link — посилання на пост у Facebook/Instagram (можна "")     */
  news: [
    { date: "27 січня 2026",  title: "Перемога у І загальноміському етапі МАН",            img: "../images/news-page/260127.jpg",      link: "https://www.facebook.com/share/p/1DbfzEyvqg/" },
    { date: "14 січня 2026",  title: "Конкурс «Різдвяне диво в стилі STEM – 2025»",        img: "../images/news-page/260114.jpg",      link: "https://www.facebook.com/share/p/1B6myqsKjh/" },
    { date: "30 грудня 2025", title: "Інтерактив англійською мовою у таборі",               img: "../images/news-page/251230.jpg",      link: "https://www.facebook.com/share/p/1ERHZffukk/" },
    { date: "23 грудня 2025", title: "Наші призери олімпіад",                               img: "../images/news-page/251223hist.jpg",  link: "https://www.facebook.com/share/p/1D2e2CasiN/" },
    { date: "22 грудня 2025", title: "Шоу талантів «ВС СКУЛ»",                              img: "../images/news-page/251222.jpg",      link: "https://www.facebook.com/share/p/1AMfkYUiRL/" },
    { date: "17 грудня 2025", title: "Свято драматичного гуртка «Снігова Королева»",        img: "../images/news-page/251217snowq.jpg", link: "https://www.facebook.com/share/p/1CNFEHN1SY/" },
    { date: "17 грудня 2025", title: "Гурток карате (шотокан)",                             img: "../images/news-page/251217.png",      link: "https://www.facebook.com/share/r/14PmMQBsXBw/" },
    { date: "23 грудня 2025", title: "Благодійний ярмарок",                                 img: "../images/news-page/251223.jpg",      link: "https://www.facebook.com/share/p/1DcdZZR25n/" }
  ],

  /* ---------- ГУРТКИ ----------
     group: lang (мови), stem (STEM і точні), art (творчість),
            sport (спорт), exam (підготовка до іспитів)          */
  circles: [
    { name: "English Speaking Club",                     group: "lang" },
    { name: "Joyful English",                            group: "lang" },
    { name: "Гурток польської мови",                     group: "lang" },
    { name: "SkyLab FPV",                                group: "stem" },
    { name: "STEM-гурток «Наука в дії»",                 group: "stem" },
    { name: "Магія ШІ",                                  group: "stem" },
    { name: "Майстерня комп'ютерних ігор",               group: "stem" },
    { name: "Математичні цікавинки",                     group: "stem" },
    { name: "МАТЕМА+",                                   group: "stem" },
    { name: "Хімія та біологія +",                       group: "stem" },
    { name: "Медіалабораторія",                          group: "stem" },
    { name: "Шахи",                                      group: "stem" },
    { name: "Арт-студія «Палітра ідей»",                 group: "art" },
    { name: "Вокальний гурток",                          group: "art" },
    { name: "Акторська майстерність",                    group: "art" },
    { name: "Ораторське мистецтво",                      group: "art" },
    { name: "Сучасний танець «Крок у ритм»",             group: "art" },
    { name: "Гурток «Творчий простір»",                  group: "art" },
    { name: "Історичний гурток",                         group: "art" },
    { name: "Карате",                                    group: "sport" },
    { name: "Стретчинг",                                 group: "sport" },
    { name: "Футбольний гурток",                         group: "sport" },
    { name: "Англійська: підготовка до ДПА (8–9 кл.)",   group: "exam" },
    { name: "Англійська: підготовка до НМТ",             group: "exam" },
    { name: "Математика: підготовка до ДПА (8–9 кл.)",   group: "exam" },
    { name: "Математика: підготовка до НМТ (10–11 кл.)", group: "exam" },
    { name: "Правопис української: підготовка до ДПА",   group: "exam" }
  ],

  /* ---------- КОМАНДА (адміністрація на головній) ---------- */
  team: [
    { name: "Клімковська Світлана Іванівна", role: "Директор",                                       photo: "../images/team/klimk.jpg" },
    { name: "Кузенко Галина Романівна",      role: "Заступник директора, вчитель початкових класів", photo: "../images/team/kuzenko.jpg" },
    { name: "Кальна Наталія Михайлівна",     role: "Заступник директора, вчитель початкових класів", photo: "../images/team/kalna.jpg" },
    { name: "Яцента Надія Петрівна",         role: "Заступник директора, вчитель географії",          photo: "../images/team/yacenta.jpg" }
  ]
};
