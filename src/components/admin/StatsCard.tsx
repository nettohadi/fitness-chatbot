interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: string
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
}: StatsCardProps) {
  return (
    <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-3xl">{icon}</span>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-foreground">
                  {value}
                </div>
              </dd>
              <dd className="text-sm text-muted-foreground mt-1">{description}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
