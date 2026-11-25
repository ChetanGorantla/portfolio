import { Hero } from "@/components/hero";
import { Mdx } from "@/components/mdx";
import { Experience, Projects } from "@/components/services";
import { getDoc, getProfile, getServices } from "@/lib/content";

export default function Dashboard() {
  const profile = getProfile();
  const services = getServices();
  return (
    <div className="shell">
      <Hero profile={profile} />
      <Experience services={services.filter((s) => s.group === "experience")} />
      <Projects services={services.filter((s) => s.group === "project")} />
      <section aria-labelledby="off-heading" className="on-dark mt-7 flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <h2 id="off-heading" className="label label-tag">
          Off the clock
        </h2>
        <Mdx source={getDoc("oncall")} variant="inline" />
      </section>
    </div>
  );
}
