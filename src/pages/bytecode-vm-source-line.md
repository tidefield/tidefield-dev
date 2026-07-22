---
layout: ../layouts/PostLayout.astro
title: Compact Bytecode-to-Source Mapping
date: "2026-07-21"
description: Compressing source-line metadata while preserving efficient bytecode lookups
image: /images/bytecode-vm-source-lines.png
---

> I encountered this problem while working through the challenges in chapter 14 of Robert Nystrom's [Crafting Interpreters](https://craftinginterpreters.com/chunks-of-bytecode.html#challenges).

> **Note:** Production VMs are more sophisticated, though I'll share how this is similar to other VMs like JVM and Lua at [the end of this post](#how-other-vms-approach-this).

## Background

The first half of the book implements a toy language, jlox, from the top down, starting with lexing and parsing to build an AST and then interpreting it. The second half re-implements the same language but from the bottom up, beginning with the bytecode structure.

<figure>
  <img src="/images/bytecode-vm-source-lines.png" alt="A bytecode chunk containing code, constants, and source-line metadata" />
  <figcaption>Source: <a href="https://craftinginterpreters.com/chunks-of-bytecode.html#what-is-bytecode"><cite>Crafting Interpreters</cite>, chapter 14</a></figcaption>
</figure>

It stores bytecode in a **chunk**, which contains a sequence of bytes. Each byte is either an opcode or an operand belonging to an opcode. Instructions can therefore occupy different numbers of bytes. For example, `OP_RETURN` is a single byte, while `OP_CONSTANT` is followed by an operand containing an index into the chunk's constant pool:

```text
offset       0                 1                 2
byte     OP_CONSTANT     constant index      OP_RETURN
             \___________________/               |
                one instruction         another instruction
```

When an instruction causes a runtime error, the VM needs a way to translate the bytecode offset back to the source line that produced it. So the chunk needs to store the line numbers.

A straightforward solution is to store a second array, `lines`, in parallel with the bytecode so that every byte gets a corresponding source line:

```text
offset:       0  1  2  3  4  5  6  7
code:        00 01 00 02 01 00 03 01
line:         1  1  1  1  1  2  2  2
```

This design is simple and gives us `O(1)` lookup. However, it takes up `O(n)` memory for `n` bytes of bytecode.

Looking at the lines array above, we can exploit the fact that several consecutive bytes can come from the same source line.
## Run-length encoding

[Run-length encoding](https://en.wikipedia.org/wiki/Run-length_encoding) stores each line number once along with the number of consecutive bytes belonging to it:

```text
line per byte:  1  1  1  1  1 | 2  2  2
encoded runs:          (5, 1) |  (3, 2)
                       count,line
```

- `n` is the number of bytecode bytes.
- `r` is the number of consecutive line runs.

Here, `n = 8` and `r = 2`. In general, `1 <= r <= n`. The best case is an entire chunk produced from one source line, where `r = 1`. The worst case changes source lines after every byte, where `r = n`. Run-length encoding reduces the line table from `O(n)` to `O(r)` memory.

### Linear search

To find the line for an arbitrary offset, we can walk through the runs while accumulating their lengths. For offset 6:

```text
(5, 1) -> covers offsets 0..4
(3, 2) -> covers offsets 5..7  <- offset 6 is here
```

A random lookup therefore takes `O(r)` time in the worst case. If we perform a new linear scan for every byte while disassembling a chunk, the total cost is `O(nr)`. Since `r` can equal `n`, the worst case is `O(n²)`.

### Linear search with cursor

However, run-length encoding is not inherently quadratic. If a disassembler visits offsets in increasing order, it can keep a cursor pointing to the current run. Each byte and each run is then visited only once, giving `O(n + r)`, which simplifies to `O(n)` because `r <= n`.

This approach is ideal for sequential traversal, but it does not improve arbitrary lookups, which remain `O(r)`. If an error gives us an offset somewhere in the middle of a chunk, we still need to scan runs from the beginning unless we store more information.

## Predecessor problem

Instead of recording run length, we can record the run's starting offset:

```text
offset:          0  1  2 | 3  4 | 5
line:            1  1  1 | 2  2 | 3
starting pairs: (0, 1)    (3, 2) (5, 3)
```

Each pair means starting at this bytecode offset, this number of subsequent bytes belong to this source line. Essentially, this is now a [static predecessor problem](https://people.seas.harvard.edu/~cs224/spring17/lec/lec1.pdf).[^1]

### Binary search

Because the pairs are sorted by their starting offsets, we can solve the static predecessor problem via a modified binary search.

Consider:

```text
starting pairs:  (0, 1)  (3, 2)  (5, 3)
```

Given a target offset of 4, we find the greatest starting offset that is less than or equal to 4 which is `(3, 2)`.

During binary search, `left` and `right` delimit the region that could still contain an exact match. If no exact match exists, they eventually cross:

```text
                         target 4
                            v
starting offsets:  0    3 | 5
                        ^   ^
                     right left
```

If there is no exact match, `pair[right]` points to the greatest starting offset below the target. Together with the exact-match case, this finds the greatest starting offset less than or equal to the target.

```rust
fn get_line(chunk: &Chunk, offset: usize) -> usize {
    let mut left = 0;
    let mut right = chunk.line_starts.len() - 1;
    while left <= right {
        let mid = left + (right - left) / 2;
        let (mid_offset, mid_line) = chunk.line_starts[mid];
        if offset < mid_offset {
            right = mid - 1;
        } else if offset > mid_offset {
            left = mid + 1;
        } else {
            return mid_line;
        }
    }
    let (_, line) = chunk.line_starts[right];
    line
}
```

This code depends on the invariants:

- `get_line` is called only for a valid bytecode offset.
- `line_starts` remain sorted because bytecode is appended in order.
### Linear search with cursor again

Binary search is useful for an arbitrary lookup. During sequential disassembly, a cursor can instead point to the current starting pair. Whenever the next pair's starting offset is less than or equal to the current bytecode offset, we advance the cursor. Because the cursor only moves forward, it visits each pair at most once, giving `O(n)` traversal overall.

This gives the starting-offset data structure two useful access patterns:

- Use binary search for a random offset: `O(log r)`.
- Use a cursor for an ordered traversal: `O(n)` overall.

The beauty is we're not forced to choose between binary search and the cursor approach. We can choose either one depending on the scenario.

## Runtime analysis

| Approach                          | Memory |        Random lookup |          Full traversal |
| --------------------------------- | -----: | -------------------: | ----------------------: |
| One line per byte                 |   `O(n)` |                 `O(1)` |                    `O(n)` |
| Run lengths + fresh linear search |   `O(r)` |                 `O(r)` | `O(nr)`, worst-case `O(n²)` |
| Run lengths + cursor              |   `O(r)` |                 `O(r)` |                    `O(n)` |
| Starting offsets + binary search  |   `O(r)` |             `O(log r)` |              `O(n log r)` |
| Starting offsets + cursor         |   `O(r)` | `O(log r)` when needed |                    `O(n)` |

## How other VMs approach this

### JVM
The JVM's [`LineNumberTable`](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4.7.12) uses essentially the same starting-offset representation. It is an optional attribute of each method's [`Code`](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html#jvms-4.7.3), and every `(start_pc, line_number)` entry marks where a source line begins. For example:

```text
(0, 10)  (4, 11)  (9, 14)
```

Bytecode offset 6 maps to line 11 because `(4, 11)` has the greatest `start_pc` less than or equal to 6. One difference is that the spec does not require the entries to be sorted. When HotSpot needs to find the line number, [`line_number_from_bci`](https://code.googlesource.com/edge/openjdk/+/4c9e8b056de9eaa7412d42edfe4bf0b29e02250e/hotspot/src/share/vm/oops/method.cpp#628) conducts a linear search to find the predecessor.

### Lua
Lua stores line information in a parallel array, similar to the book's implementation. However, instead of storing the exact line number for every instruction, it stores the one-byte delta from the previous line number and occasional absolute checkpoints ([source](https://github.com/lua/lua/blob/84938a7d2b680d2d28ec99606e84fe712efd9a69/lobject.h#L568-L577)) to keep lookup scans bounded ([writer](https://github.com/lua/lua/blob/84938a7d2b680d2d28ec99606e84fe712efd9a69/lcode.c#L324-L346), [reader](https://github.com/lua/lua/blob/84938a7d2b680d2d28ec99606e84fe712efd9a69/ldebug.c#L80-L97)).

For example, given an absolute checkpoint of `(pc 2, line 300)`:

```text
instruction:  0   1    2    3    4
source line: 10  10  300  310  314
lineinfo:     0   0  ABS   +10   +4
```

To find the line for instruction 4, Lua starts at line 300 and adds the following deltas: `300 + 10 + 4 = 314`.

[^1]: While researching this problem, I discovered that it is referred to as a static predecessor problem in the [first lecture of Harvard's CS224: Advanced Algorithms course](https://youtu.be/0JUN9aDxVmI?si=ZqUIW5ZrwZuBPvAU&t=629). The lecture also introduces the dynamic predecessor problem and the word RAM model. I only skimmed those topics, but I hope to encounter a practical use for them whether in a bytecode VM or somewhere else.
