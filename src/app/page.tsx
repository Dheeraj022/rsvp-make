export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl fading-in">
          RSVP Events
        </h1>
        <p className="text-lg text-muted-foreground">
          A seamless experience for managing your most important moments.
        </p>
        <div className="flex justify-center gap-4">
          {/* Future Buttons */}
        </div>
      </div>
    </main>
  );
}
