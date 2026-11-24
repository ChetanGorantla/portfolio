import { Hero } from "@/components/hero";
import { Notes } from "@/components/notes";
import { OverviewStrip } from "@/components/overview-strip";
import { ServicesGrid } from "@/components/services-grid";
import { getDoc, getProfile, getServices } from "@/lib/content";

export default function Dashboard() {
  const profile = getProfile();
  return (
    <div className="shell">
      <Hero profile={profile} />
      <OverviewStrip tiles={profile.overview} />
      <ServicesGrid services={getServices()} />
      <Notes changelog={getDoc("changelog")} oncall={getDoc("oncall")} />
    </div>
  );
}
