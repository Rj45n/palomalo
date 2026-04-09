#!/usr/bin/env node

/**
 * Script de test pour analyser le CPU depuis un TSF réel
 * Usage: node test-tsf-cpu.js
 */

const fs = require('fs');
const path = require('path');

// Lire le fichier dp-monitor.log extrait
const dpMonitorPath = '/home/romain/opt/var.dp0/log/pan/dp-monitor.log';
const mpMonitorPath = '/home/romain/var/log/pan/mp-monitor.log';

console.log('🔍 Analyse du CPU depuis le TSF réel\n');

// 1. Analyser Management Plane CPU (depuis mp-monitor.log)
console.log('📊 Management Plane CPU (depuis mp-monitor.log):');
try {
  const mpContent = fs.readFileSync(mpMonitorPath, 'utf-8');
  
  // Chercher les lignes "top -"
  const topMatches = mpContent.match(/top - .+\n.+\n%Cpu\(s\):.+/g);
  
  if (topMatches && topMatches.length > 0) {
    // Prendre la dernière mesure
    const lastTop = topMatches[topMatches.length - 1];
    console.log(lastTop);
    
    // Parser le CPU
    const cpuLine = lastTop.match(/%Cpu\(s\):\s*([\d\.\s,a-z]+)/i);
    if (cpuLine) {
      const cpuStr = cpuLine[1];
      const us = parseFloat(cpuStr.match(/(\d+\.\d+)\s+us/)?.[1] || "0");
      const sy = parseFloat(cpuStr.match(/(\d+\.\d+)\s+sy/)?.[1] || "0");
      const ni = parseFloat(cpuStr.match(/(\d+\.\d+)\s+ni/)?.[1] || "0");
      const wa = parseFloat(cpuStr.match(/(\d+\.\d+)\s+wa/)?.[1] || "0");
      const hi = parseFloat(cpuStr.match(/(\d+\.\d+)\s+hi/)?.[1] || "0");
      const si = parseFloat(cpuStr.match(/(\d+\.\d+)\s+si/)?.[1] || "0");
      const id = parseFloat(cpuStr.match(/(\d+\.\d+)\s+id/)?.[1] || "0");
      
      const totalCPU = us + sy + ni + wa + hi + si;
      
      console.log(`\n✅ Management Plane CPU:`);
      console.log(`   us (user)      : ${us}%`);
      console.log(`   sy (system)    : ${sy}%`);
      console.log(`   ni (nice)      : ${ni}%`);
      console.log(`   wa (wait)      : ${wa}%`);
      console.log(`   hi (hw int)    : ${hi}%`);
      console.log(`   si (sw int)    : ${si}%`);
      console.log(`   id (idle)      : ${id}%`);
      console.log(`   ─────────────────────────`);
      console.log(`   TOTAL UTILISÉ  : ${totalCPU.toFixed(1)}%`);
      console.log(`   (100 - idle)   : ${(100 - id).toFixed(1)}%`);
    }
  }
} catch (e) {
  console.log(`❌ Erreur: ${e.message}`);
}

console.log('\n' + '='.repeat(60) + '\n');

// 2. Analyser Data Plane CPU (depuis dp-monitor.log)
console.log('📊 Data Plane CPU (depuis dp-monitor.log):');
try {
  const dpContent = fs.readFileSync(dpMonitorPath, 'utf-8');
  
  // Chercher la section "Resource monitoring statistics (per minute)"
  const minuteSection = dpContent.match(/Resource monitoring statistics \(per minute\):[\s\S]+?:core\s+0\s+1[\s\S]+?(?=\n\n|$)/);
  
  if (minuteSection) {
    const section = minuteSection[0];
    
    // Parser les lignes de CPU par core
    // Format: "       0   0   9  12  22  27  17  22  21  27  17  22  21  26  17  21"
    // Les colonnes sont: core0_avg core0_max core1_avg core1_max ...
    
    const cpuLines = section.split('\n').filter(line => line.match(/^\s+\d+\s+\d+/));
    
    console.log(`Trouvé ${cpuLines.length} lignes de mesures\n`);
    
    if (cpuLines.length > 0) {
      // Prendre la dernière ligne (la plus récente)
      const lastLine = cpuLines[cpuLines.length - 1];
      const values = lastLine.trim().split(/\s+/).map(v => parseInt(v, 10));
      
      console.log(`Dernière mesure: ${values.slice(0, 20).join(' ')}...`);
      
      // Les valeurs sont: core0_avg core0_max core1_avg core1_max ...
      // On veut les moyennes (indices pairs)
      const avgValues = [];
      for (let i = 0; i < values.length; i += 2) {
        avgValues.push(values[i]);
      }
      
      // Calculer statistiques
      const sum = avgValues.reduce((a, b) => a + b, 0);
      const avg = sum / avgValues.length;
      const max = Math.max(...avgValues);
      const min = Math.min(...avgValues);
      
      console.log(`\n✅ Data Plane CPU (${avgValues.length} cores):`);
      console.log(`   Moyenne        : ${avg.toFixed(1)}%`);
      console.log(`   Maximum        : ${max}%`);
      console.log(`   Minimum        : ${min}%`);
      console.log(`\n   Distribution par core (avg):`);
      
      // Afficher les 10 premiers cores
      for (let i = 0; i < Math.min(10, avgValues.length); i++) {
        const bar = '█'.repeat(Math.round(avgValues[i] / 2));
        console.log(`   Core ${i.toString().padStart(2)}: ${bar} ${avgValues[i]}%`);
      }
      
      if (avgValues.length > 10) {
        console.log(`   ... (${avgValues.length - 10} cores supplémentaires)`);
      }
      
      // Identifier les cores les plus chargés
      const topCores = avgValues
        .map((cpu, idx) => ({ core: idx, cpu }))
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 5);
      
      console.log(`\n   Top 5 cores les plus chargés:`);
      topCores.forEach(({ core, cpu }) => {
        console.log(`   Core ${core}: ${cpu}%`);
      });
    }
  } else {
    console.log('❌ Section "Resource monitoring statistics" non trouvée');
  }
} catch (e) {
  console.log(`❌ Erreur: ${e.message}`);
}

console.log('\n' + '='.repeat(60) + '\n');

// 3. Résumé
console.log('📋 RÉSUMÉ:');
console.log('   Le CPU affiché dans PaloMalo devrait être le Data Plane CPU (moyenne)');
console.log('   car c\'est lui qui traite le trafic réseau.');
console.log('\n   Si l\'interface web du firewall affiche un CPU différent,');
console.log('   c\'est peut-être qu\'elle utilise le maximum au lieu de la moyenne.');
