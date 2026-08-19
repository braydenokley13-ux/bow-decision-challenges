/**
 * Print the evidence-chain receipt.
 *
 *     npx tsx scripts/evidence-chain.ts > gauntlet/evidence/chain-one-student.md
 *
 * The document itself is built in `src/test/chainDocument.ts`, where the typechecker and the
 * suite can both reach it. `src/test/chainReceipt.test.ts` fails if the committed document has
 * stopped matching what the product produces.
 */
import { chainDocument } from "../src/test/chainDocument";

process.stdout.write(chainDocument());
