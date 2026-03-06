const fs = require('fs');
const path = require('path');

const directory = 'web/src';

const replacements = [
    { from: /\/customer\/app/g, to: '/dashboard' },
    { from: /\/customer\/profile/g, to: '/profile' },
    { from: /\/customer\/login/g, to: '/login' },
    { from: /\/admin\/app\/providers/g, to: '/admin/providers' },
    { from: /\/admin\/app\/bookings/g, to: '/admin/bookings' },
    { from: /\/admin\/app\/commissions/g, to: '/admin/commissions' },
    { from: /\/admin\/app\/users/g, to: '/admin/users' },
    { from: /\/admin\/app/g, to: '/admin' },
    { from: /\/provider\/app\/earnings/g, to: '/provider/earnings' },
    { from: /\/provider\/app\/profile/g, to: '/provider/profile' },
    { from: /\/provider\/app/g, to: '/provider' },
    { from: /to="\/customer"/g, to: 'to="/"' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            replacements.forEach(r => {
                content = content.replace(r.from, r.to);
            });

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

processDirectory(directory);
console.log('Done.');
