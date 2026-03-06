const https = require('https');
const fs = require('fs');
https.get('https://api.github.com/repos/sneha4learning-png/primesewa-mvp/actions/runs/22750309309/jobs', { headers: { 'User-Agent': 'node.js' } }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        const jobs = JSON.parse(data).jobs;
        const jobId = jobs[0].id;
        https.get(`https://api.github.com/repos/sneha4learning-png/primesewa-mvp/actions/jobs/${jobId}/logs`, { headers: { 'User-Agent': 'node.js' } }, res2 => {
            if (res2.statusCode === 302 || res2.statusCode === 301) {
                https.get(res2.headers.location, { headers: { 'User-Agent': 'node.js' } }, res3 => {
                    let log = '';
                    res3.on('data', d => log += d);
                    res3.on('end', () => {
                        fs.writeFileSync('job_log.txt', log);
                        console.log('Log fetched successfully.');
                    });
                });
            } else {
                console.log('Redirect not found, status:', res2.statusCode);
            }
        });
    });
}).on('error', e => console.error(e));
