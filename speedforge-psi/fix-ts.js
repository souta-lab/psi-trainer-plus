import fs from 'fs';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src');
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    // Fix React imports (remove 'React' but keep others like useState)
    content = content.replace(/import React(?:,? \{([^}]+)\})? from 'react';\n?/g, (match, g1) => {
        if (g1) {
            return `import { ${g1} } from 'react';\n`;
        }
        return ''; // Remove entirely if it's just `import React from 'react';`
    });

    content = content.replace(/import \{([^}]+GameProps[^}]+)\} from '\.\/types';/g, "import type { $1 } from './types';");
    content = content.replace(/import \{([^}]+GameResult[^}]+)\} from '\.\.\/utils\/storage';/g, "import type { $1 } from '../utils/storage';");
    content = content.replace(/import \{([^}]+UserStats[^}]+)\} from '\.\.\/utils\/storage';/g, "import type { $1 } from '../utils/storage';");
    content = content.replace(/import { ReactNode } from 'react';\n?/g, "import type { ReactNode } from 'react';\n");

    if (file.endsWith('App.tsx')) {
        content = content.replace(/import \{ loadUserStats, saveUserStats, updateStreak, UserStats, GameResult, getTodayDateString \} from '\.\/utils\/storage';/,
            "import { loadUserStats, saveUserStats, updateStreak, type UserStats, type GameResult, getTodayDateString } from './utils/storage';");
    }

    if (file.endsWith('RSVP.tsx')) {
        content = content.replace(/const sequence = \[\];/g, "const sequence: string[] = [];");
    }
    fs.writeFileSync(file, content);
}
