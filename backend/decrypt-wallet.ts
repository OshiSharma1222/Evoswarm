/**
 * Amadeus Wallet Decryption Script
 * Extracts the private key from encrypted wallet JSON
 */
import crypto from 'crypto';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function decrypt(encryptedData: string, password: string, salt: string, iv: string): string {
  const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), 100000, 32, 'sha256');
  const ivBuffer = Buffer.from(iv, 'base64');
  
  // Try AES-256-GCM first (supports 12-byte IV)
  if (ivBuffer.length === 12) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
      const encrypted = Buffer.from(encryptedData, 'base64');
      
      // Split auth tag (last 16 bytes) from ciphertext
      const authTag = encrypted.subarray(encrypted.length - 16);
      const ciphertext = encrypted.subarray(0, encrypted.length - 16);
      
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (gcmError) {
      // If GCM fails, try CTR mode
      const decipher = crypto.createDecipheriv('aes-256-ctr', key, ivBuffer);
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  }
  
  // Fallback to CBC for 16-byte IV
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

const walletData = {
  encryptedData: "L06bKNv00jeys9ueB2whCQJypXFku1NIt4VHReS5lQRw5PWgaXlMxQQguAB8tLFsa6AR5D4VtcVcw/JMHIjCmONS7axLARabHqSdFoe5Im/ylM1kA6krX943CuIMr8jIPMmvjoo1KvVg250b9A+waR/6nwngMbcY+1PtP/R4WyPqWHUuW7Bolhj9eZdzRyYpIlGrAFu+3Fkk0jm0mRZVh2Zj0RUGN+NRiYrYU1l0rL5+ZvC3AAbIhIY2uiGLkMmmiqWHJYMOkKYYw/daSyJumaQXLDnZWZcuF2AWtlHCrYsT5iOtfc06s4ZkuxMATQlw47+fAhujEIZBsE6tAHJsZ1nxCCSknEVmctyMNJUT4pFG+1cFClUDo8nsiKDaldGQqZM3kZTI6/tYO6NA",
  salt: "F0KiD+tNpRCLO3AwJOm0Ug==",
  iv: "ZiJ5aRW5w9RHa88/"
};

console.log('🔓 Amadeus Wallet Decryption\n');
console.log('Enter the password you set when creating your wallet.\n');

rl.question('Password: ', (password) => {
  try {
    const decrypted = decrypt(walletData.encryptedData, password, walletData.salt, walletData.iv);
    const walletJson = JSON.parse(decrypted);
    
    console.log('\n✅ Wallet decrypted successfully!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 Private Key (Base58):');
    console.log(walletJson.privateKey || walletJson.secretKey || walletJson.key || walletJson.mnemonic);
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📝 Add to backend/.env:');
    console.log(`AMADEUS_PRIVATE_KEY=${walletJson.privateKey || walletJson.secretKey || walletJson.key}`);
    console.log('\n⚠️  Keep this key SECRET - never share it!\n');
    
  } catch (error: any) {
    console.error('\n❌ Failed to decrypt wallet');
    if (error.message.includes('bad decrypt')) {
      console.error('   Reason: Wrong password\n');
    } else {
      console.error('   Reason:', error.message, '\n');
    }
  }
  
  rl.close();
});
