import { HeroConsole } from "@/components/home/HeroConsole";
import { ImpactStrip } from "@/components/home/ImpactStrip";
import { ServiceRail } from "@/components/home/ServiceRail";
import { LaunchPath } from "@/components/home/LaunchPath";
import { IncomeDesigner } from "@/components/home/IncomeDesigner";
import { NetworkLadder } from "@/components/home/NetworkLadder";
import { ProofLoop } from "@/components/home/ProofLoop";
import { TrustVault } from "@/components/home/TrustVault";
import { BharatGrid } from "@/components/home/BharatGrid";
import { PlansBoard } from "@/components/home/PlansBoard";
import { AnswerDesk } from "@/components/home/AnswerDesk";
import { ClosingSlab } from "@/components/home/ClosingSlab";

/**
 * TRANSPE home — the "counter console" narrative.
 *
 * Flow: prove it's alive (hero + numbers) → show the catalogue → show how
 * fast you start → let the visitor model their income → explain the network
 * → social proof → regulation → India reach → pricing → objections → close.
 */
export default function HomePage() {
  return (
    <>
      <HeroConsole />
      <ImpactStrip />
      <ServiceRail />
      <LaunchPath />
      <IncomeDesigner />
      <NetworkLadder />
      <ProofLoop />
      <TrustVault />
      <BharatGrid />
      <PlansBoard />
      <AnswerDesk />
      <ClosingSlab />
    </>
  );
}
