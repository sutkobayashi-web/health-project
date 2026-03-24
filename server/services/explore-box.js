/**
 * Box フォルダ探索スクリプト
 * 健診データのフォルダIDとデータ構造を確認する
 *
 * 使い方: node server/services/explore-box.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { getBoxToken } = require('./backup');
const fetch = require('node-fetch');

async function listFolder(token, folderId, indent = '') {
  const res = await fetch(
    `https://api.box.com/2.0/folders/${folderId}?fields=id,name,type,item_collection`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  );
  const folder = await res.json();
  if (!res.ok) {
    console.error(indent + 'エラー:', JSON.stringify(folder));
    return;
  }
  console.log(indent + `📁 [${folder.id}] ${folder.name}`);
  const entries = folder.item_collection?.entries || [];
  for (const item of entries) {
    if (item.type === 'folder') {
      console.log(indent + `  📁 [${item.id}] ${item.name}`);
    } else {
      console.log(indent + `  📄 [${item.id}] ${item.name}`);
    }
  }
  return { folder, entries };
}

async function findFolderByPath(token, startFolderId, pathParts) {
  let currentId = startFolderId;
  for (const part of pathParts) {
    const res = await fetch(
      `https://api.box.com/2.0/folders/${currentId}/items?fields=id,name,type&limit=1000`,
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error('フォルダ取得エラー:', JSON.stringify(data));
      return null;
    }
    const found = data.entries?.find(e => e.type === 'folder' && e.name.includes(part));
    if (!found) {
      console.error(`"${part}" が見つかりません。現在のフォルダ内容:`);
      data.entries?.forEach(e => console.log(`  ${e.type === 'folder' ? '📁' : '📄'} ${e.name}`));
      return null;
    }
    console.log(`✅ "${part}" → [${found.id}] ${found.name}`);
    currentId = found.id;
  }
  return currentId;
}

async function main() {
  const token = await getBoxToken();
  console.log('Box認証OK\n');

  // ルートフォルダ(0)から目的のパスを辿る
  // 902_管理課 → 安全衛生健康管理 → ヘルスケアネットワーク
  console.log('=== フォルダパス探索 ===');
  const targetId = await findFolderByPath(token, '0', [
    '902_管理課',
    '安全衛生健康管理',
    'ヘルスケアネットワーク'
  ]);

  if (!targetId) {
    console.log('\n目的のフォルダが見つかりませんでした。');
    return;
  }

  console.log(`\n=== 健診フォルダの中身 [${targetId}] ===`);
  const { entries } = await listFolder(token, targetId);

  // サブフォルダがあれば1階層掘る
  if (entries) {
    for (const item of entries) {
      if (item.type === 'folder') {
        console.log(`\n--- サブフォルダ: ${item.name} ---`);
        await listFolder(token, item.id, '  ');
      }
    }
  }
}

main().catch(e => {
  console.error('エラー:', e.message);
  process.exit(1);
});
