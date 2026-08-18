import { useMemo } from "react";
import { useChallenge } from "../../app/ChallengeContext";
import { PopUpProvider, usePopUp } from "./PopUpContext";
import {
  FirstSaturdayStage, GeneratorStage, MoneyStage, PlanStage, RepairStage,
  SettleStage, SpotStage, StandingOrderStage, SubmittedStage, WriteUpStage,
} from "./PopUpScreens";

/**
 * Run the Pop-Up, from the join the student already did to the answer they hand in.
 *
 * The seat comes from the screen that joined the class; everything after it belongs to this
 * world's own machine. That is the whole seam between the two worlds: one fact crosses it —
 * who is sitting here — and no decision, no economy and no evidence ever does.
 */
export function PopUpChallenge() {
  const { state, transport } = useChallenge();
  const { classCode, seatCode, assignmentId } = state.meta;
  const seed = useMemo(() => ({ classCode, seatCode, assignmentId }), [classCode, seatCode, assignmentId]);
  return (
    <PopUpProvider seed={seed} transport={transport}>
      <PopUpStages />
    </PopUpProvider>
  );
}

function PopUpStages() {
  const { state } = usePopUp();
  switch (state.stage) {
    case "popup-spot": return <SpotStage />;
    case "popup-money": return <MoneyStage />;
    case "popup-plan": return <PlanStage />;
    case "popup-first-saturday": return <FirstSaturdayStage />;
    case "popup-standing-order": return <StandingOrderStage />;
    case "popup-generator": return <GeneratorStage />;
    case "popup-repair": return <RepairStage />;
    case "popup-settle": return <SettleStage />;
    case "popup-writeup": return <WriteUpStage />;
    case "popup-submitted": return <SubmittedStage />;
    // The one frame between the machine being created and starting itself. It has no content
    // because there is nothing true to say yet, and inventing a loading story for 16ms would
    // be a screen that exists for the developer rather than the student.
    default: return <div className="popup-shell" data-world="food-truck" />;
  }
}
