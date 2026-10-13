import Breadcrumbs from '@/components/Breadcrumbs';
import CtaLine from '@/components/CtaLine';
import { categoryHref } from '@/components/WorkCategoryView';
import JsonLd from '@/components/JsonLd';
import ProjectGallery from '@/components/ProjectGallery';
import ProjectMosaic from '@/components/ProjectMosaic';
import { type PatternName } from '@/components/Contours';
import { getWorkCategory, type WorkTabSlug } from '@/lib/content';
import { projectHref, projects, projectsFor, type Project } from '@/lib/projects';
import { orgId, site } from '@/lib/site';

/** A different chart motif for each project, cycling through the set. */
const patterns: PatternName[] = ['swell', 'islands', 'ripples', 'isobars', 'currents', 'drops', 'archipelago'];

/**
 * One Production project: the cover as a full-width hero with the breadcrumb,
 * title, description and place set over it, then the story and the pictures on a rail that
 * scrolls sideways.
 */
export default function ProjectView({ project }: { project: Project }) {
  const tabLabel = getWorkCategory('production').tabs?.find((t) => t.slug === project.tab)?.label ?? '';
  const here = projectHref(project);
  const tabHref = categoryHref('production', project.tab as WorkTabSlug);

  const siblings = projectsFor(project.tab);
  const nextProject = siblings[(siblings.indexOf(project) + 1) % siblings.length];

  const { cover } = project;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: `${project.title} | Asri Studios`,
          url: `${site.url}${here}`,
          description: project.lead,
          image: `${site.url}${cover.src}`,
          creator: { '@id': orgId },
        }}
      />

      <section className="project-hero">
        <div className="project-hero__frame clip-reveal">
          <img
            src={cover.src}
            alt={cover.alt}
            width={cover.w}
            height={cover.h}
            style={cover.pos ? { objectPosition: cover.pos } : undefined}
          />
          <span className="project-hero__scrim" aria-hidden="true" />
          <Breadcrumbs
            light
            items={[
              { href: '/work/', label: 'Work' },
              { href: '/work/production/', label: 'Production' },
              // Travel is Production's own page, so it has no crumb of its own.
              ...(tabHref === '/work/production/' ? [] : [{ href: tabHref, label: tabLabel }]),
              { href: here, label: project.title },
            ]}
          />
          <div className="project-hero__head">
            <h1 className="page-title line-mask">{project.title}</h1>
            <p className="lead">{project.lead}</p>
            <p className="project-hero__place">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M20 10c0 6.5-8 12-8 12s-8-5.5-8-12a8 8 0 0 1 16 0z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {project.location}
            </p>
          </div>
        </div>
      </section>

      <div className="project-body">
        <ProjectGallery
          title={project.title}
          story={project.story}
          pattern={patterns[projects.indexOf(project) % patterns.length]}
          gallery={project.gallery}
          next={
            nextProject && nextProject !== project
              ? {
                  href: projectHref(nextProject),
                  title: nextProject.title,
                  tile: nextProject.tile,
                  cover: nextProject.cover,
                }
              : undefined
          }
        />
        <ProjectMosaic title={project.title} items={project.more ?? []} />
      </div>

      <CtaLine location="project_page" />
    </>
  );
}
