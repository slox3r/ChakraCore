//-------------------------------------------------------------------------------------------------------
// Copyright (C) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE.txt file in the project root for full license information.
//-------------------------------------------------------------------------------------------------------

const module = new WebAssembly.Module(readbuffer('binaries/table_imports.wasm'));

function customAdd(a, b) {
  print("custom add (+5.42)");
  return a + b + 5.42;
}

const types = [{
  name: "binopI32",
  start: 0,
}, {
  name: "binopI64",
  start: 2,
  trap: [3] // tests that are expected to trap
}, {
  name: "binopF32",
  start: 4,
}, {
  name: "binopF64",
  start: 6,
}];

function runTests(exports) {
  types.forEach(({name, start, trap = []}) => {
    const end = start + 1; // only 2 methods for each types
    const isValidRange = i => i >= start && i <= end;
    for(let i = 0; i < 8; ++i) {
      try {
        if (isValidRange(i)) {
          const val = exports[name](1, 2, i);
          print(val);
          if (trap.includes(i)) {
            print(`${name}[${i}] failed. Expected to trap`);
          }
        } else {
          print(`${name}[${i}] failed. Table invalid signature call NYI.`);
        }
      } catch (e) {
        if (isValidRange(i) && !trap.includes(i)) {
          print(`${name}[${i}] failed. Unexpected error: ${e}`);
        }
      }
    }
  });
}

function fixUpI64(exports) {
  const oldI64Fn = exports.binopI64;
  exports.binopI64 = WebAssembly.nativeTypeCallTest.bind(null, oldI64Fn);
}

const {exports} = new WebAssembly.Instance(module, {
  math: {
    addI32: customAdd,
    addI64: customAdd,
    addF32: customAdd,
    addF64: customAdd,
  }
});
fixUpI64(exports);
runTests(exports);

print("\n\n Rerun tests with new instance using previous module's imports");
const {exports: exports2} = new WebAssembly.Instance(module, {math: exports});
// int64 is no longer expected to trap when using a wasm module as import
types[1].trap = [];
fixUpI64(exports2);
runTests(exports2);
