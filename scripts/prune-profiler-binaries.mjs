#! /usr/bin/env node
import { argv, exit } from 'process';
import { readdirSync, statSync, unlinkSync } from 'fs';

let SOURCE_DIR, PLATFORM, ARCH, STDLIB, NODE, HELP;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--target_dir_path=')) {
    SOURCE_DIR = arg.split('=')[1];
    continue;
  }

  if (arg.startsWith('--target_platform=')) {
    PLATFORM = arg.split('=')[1];
    continue;
  }

  if (arg.startsWith('--target_arch=')) {
    ARCH = arg.split('=')[1];
    continue;
  }

  if (arg.startsWith('--target_stdlib=')) {
    STDLIB = arg.split('=')[1];
    continue;
  }

  if (arg.startsWith('--target_node=')) {
    NODE = arg.split('=')[1];
    continue;
  }

  if (arg === '--help' || arg === '-h') {
    HELP = true;
    continue;
  }
}

if (HELP) {
  console.log(
    `\nSentry: Prune profiler binaries\n
Usage: sentry-prune-profiler-binaries --target_dir_path=... --target_platform=... --target_arch=... --target_stdlib=...\n
Arguments:\n
--target_dir_path: Path to the directory containing the final bundled code. If you are using webpack, this would be the equivalent of output.path option.\n
--target_node: The major node version the code will be running on. Example: 14, 16, 18...\n
--target_platform: The platform the code will be running on. Example: linux, darwin, win32\n
--target_arch: The architecture the code will be running on. Example: x64, arm64\n
--target_stdlib: The standard library the code will be running on. Example: glibc, musl\n
--dry-run: Do not delete any files, just print the files that would be deleted.\n
--help: Print this help message.\n`
  );
  exit(0);
}

const ARGV_ERRORS = [];

const NODE_TO_ABI = {
  14: '83',
  16: '93',
  18: '108',
  20: '115'
};

if (NODE) {
  console.log('HAS TARGET');
  if (NODE_TO_ABI[NODE]) {
    NODE = NODE_TO_ABI[NODE];
  } else if (NODE.startsWith('14')) {
    NODE = NODE_TO_ABI['14'];
  } else if (NODE.startsWith('16')) {
    NODE = NODE_TO_ABI['16'];
  } else if (NODE.startsWith('18')) {
    NODE = NODE_TO_ABI['18'];
  } else if (NODE.startsWith('20')) {
    NODE = NODE_TO_ABI['20'];
  } else {
    ARGV_ERRORS.push(
      `❌ Sentry: Invalid node version passed as argument, please make sure --target_node is a valid major node version. Supported versions are 14, 16, 18 and 20.`
    );
  }
  console.log('RESOVLED TO', NODE);
}

if (!SOURCE_DIR) {
  ARGV_ERRORS.push(
    `❌ Sentry: Missing target_dir_path argument. target_dir_path should point to the directory containing the final bundled code. If you are using webpack, this would be the equivalent of output.path option.`
  );
}

if (!PLATFORM && !ARCH && !STDLIB) {
  ARGV_ERRORS.push(
    `❌ Sentry: Missing argument values, pruning requires either --target_platform, --target_arch or --targer_stdlib to be passed as argument values.\n Example: sentry-prune-profiler-binaries --target_platform=linux --target_arch=x64 --target_stdlib=glibc\n
If you are unsure about the execution environment, you can opt to skip some values, but at least one value must be passed.`
  );
}

if (ARGV_ERRORS.length > 0) {
  console.log(ARGV_ERRORS.join('\n'));
  exit(1);
}

const SENTRY__PROFILER_BIN_REGEXP = /sentry_cpu_profiler-.*\.node$/;
async function findSentryProfilerBinaries(source_dir) {
  const binaries = new Set();
  const queue = [source_dir];

  while (queue.length > 0) {
    const dir = queue.pop();

    for (const file of readdirSync(dir)) {
      if (SENTRY__PROFILER_BIN_REGEXP.test(file)) {
        binaries.add(dir + '/' + file);
        continue;
      }

      if (statSync(dir + '/' + file).isDirectory()) {
        if (file === 'node_modules') {
          continue;
        }

        queue.push(dir + '/' + file);
      }
    }
  }

  return binaries;
}

function bytesToHumanReadable(bytes) {
  if (bytes < 1024) {
    return bytes + ' Bytes';
  } else if (bytes < 1048576) {
    return (bytes / 1024).toFixed(2) + ' KiB';
  } else {
    return (bytes / 1048576).toFixed(2) + ' MiB';
  }
}

async function prune(binaries) {
  let bytesSaved = 0;
  let removedBinariesCount = 0;

  const conditions = [PLATFORM, ARCH, STDLIB, NODE].filter((n) => !!n);
  console.log(conditions);
  for (const binary of binaries) {
    if (conditions.every((condition) => binary.includes(condition))) {
      continue;
    }

    const stats = statSync(binary);
    bytesSaved += stats.size;
    removedBinariesCount++;

    if (argv.includes('--dry-run')) {
      console.log(`Sentry: would have pruned ${binary} (${bytesToHumanReadable(stats.size)})`);
      continue;
    }

    console.log(`Sentry: pruned ${binary} (${bytesToHumanReadable(stats.size)})`);
    unlinkSync(binary);
  }

  if (removedBinariesCount === 0) {
    console.log(
      `❌ Sentry: no binaries pruned, please make sure target argument values are valid or use --help for more information.`
    );
    return;
  }

  if (argv.includes('--dry-run')) {
    console.log(
      `✅ Sentry: would have pruned ${removedBinariesCount} ${
        removedBinariesCount === 1 ? 'binary' : 'binaries'
      } and saved ${bytesToHumanReadable(bytesSaved)}.`
    );
    return;
  }

  console.log(
    `✅ Sentry: pruned ${removedBinariesCount} ${
      removedBinariesCount === 1 ? 'binary' : 'binaries'
    }, saved ${bytesToHumanReadable(bytesSaved)} in total.`
  );
}

const binaries = await findSentryProfilerBinaries(SOURCE_DIR);
await prune(binaries);
