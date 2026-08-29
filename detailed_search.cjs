const fs = require('fs');

const terms = [
  // List 1: Profile & Group Details
  "منشور", "متابِع", "متابَع", "تعديل الملف الشخصي", "مشاركة", "مكالمة نشطة", "مكالمة", "كتم", "بحث", "مراسلة", "المعلومات", "إضافة أعضاء", "الوسائط المشتركة", "الأعضاء", "مالك", "عضو",
  // List 2: Group Edit & Options
  "تعديل", "اسم المجموعة", "الوصف", "اكتب وصفاً مختصراً", "الرابط المخصص", "الإعدادات المتقدمة", "التفاعلات", "الصلاحيات", "إدارة الصلاحيات", "المشرفون", "المكتومون", "المحظورون", "الأعضاء", "الإحصائيات", "المظهر", "المكافح العنيف للإزعاج", "إخفاء الأعضاء", "حذف ومغادرة المجموعة"
];

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

const matchedLines = [];

lines.forEach((line, index) => {
  const lineNum = index + 1;
  const matched = [];
  terms.forEach(term => {
    if (line.includes(term)) {
      matched.push(term);
    }
  });
  if (matched.length > 0) {
    matchedLines.push({ lineNum, text: line.trim(), matched });
  }
});

fs.writeFileSync('search_results.json', JSON.stringify(matchedLines, null, 2));
console.log(`Found ${matchedLines.length} matched lines.`);
