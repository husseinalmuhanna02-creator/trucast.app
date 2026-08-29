const fs = require('fs');

const terms = [
  // List 1
  "منشور", "متابِع", "متابَع", "تعديل الملف الشخصي", "مشاركة", "مكالمة نشطة", "مكالمة", "كتم", "بحث", "مراسلة", "المعلومات", "إضافة أعضاء", "الوسائط المشتركة", "الأعضاء", "مالك", "عضو",
  // List 2
  "تعديل", "اسم المجموعة", "الوصف", "اكتب وصفاً مختصراً", "الرابط المخصص", "الإعدادات المتقدمة", "التفاعلات", "الصلاحيات", "إدارة الصلاحيات", "المشرفون", "المكتومون", "المحظورون", "الأعضاء", "الإحصائيات", "المظهر", "المكافح العنيف للإزعاج", "إخفاء الأعضاء", "حذف ومغادرة المجموعة"
];

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const untranslated = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;
  terms.forEach(term => {
    if (line.includes(term)) {
      // Check if it's already translated: e.g. t("term") or t('term') or t(`term`)
      const tRegex1 = new RegExp(`t\\(\\s*['"\`].*?${term}.*?['"\`]\\s*\\)`);
      if (!tRegex1.test(line)) {
        // Also check if it is part of comments, imports, or variable names
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.includes('import') && !line.includes('const ') && !line.includes('let ') && !line.includes('function ') && !line.includes('class ')) {
          untranslated.push({ lineNum, term, text: line.trim() });
        }
      }
    }
  });
});

console.log(`Found ${untranslated.length} potentially untranslated matches.`);
fs.writeFileSync('untranslated.json', JSON.stringify(untranslated, null, 2));
// Print first 50 results
untranslated.slice(0, 80).forEach(item => {
  console.log(`${item.lineNum} [${item.term}]: ${item.text}`);
});
