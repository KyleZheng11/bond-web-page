import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div>
      {/* Section 1: Header */}
      <section>
        <div className="p-8">
          <header className="pb-4 mb-6">
            <h1 className="flex items-center gap-4 text-2xl font-bold text-center">
              {/* TODO: When user presses Bond, takes back to home page/top of page. */}
              <motion.button 
                className="text-accent-amber"
                whileHover={{scale: 1.2}}
                whileTap={{scale: 0.85}}
              >
                Bond 
              </motion.button>

              <motion.div
                className="w-5 h-5 bg-amber-500 text-xs"
                animate={{
                    // scale: [1, 2, 2, 1, 1],
                    rotate: [0, 0, 180, 180, 0],
                    borderRadius: ["0%", "0%", "50%", "50%", "0%"],
                }}
                transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.5, 0.8, 1],
                    repeat: Infinity,
                    repeatDelay: 1,
                }}
              >Insert Bond Logo</motion.div>
            </h1>
          </header>
        </div>
      

        {/* Action/Body Statement */}
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg">
            <div className="text-6xl font-bold mb-6">
              <p className="text-gradient-bond">Find Your Bonding Language</p>
            </div>
            <p className="font-bold">Bond makes being with your friends easy and seamless, no matter the situation</p>

            <motion.button 
              className="border-1 hover:border-3 rounded-4xl p-2 bg-accent-electric mt-6"
              whileHover={{scale: 1.1}}
              whileTap={{scale: 0.95}}
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Going Out
            </motion.button>
          </div>
        </div>

        {/* Video */}
        <div className="flex justify-center items-center m-6 rounded-3xl py-12 max-w-4xl mx-auto">
            <div className="video-float-frame rounded-2xl p-3"                                                                                                
              style={{                                                                                                                                      
                background: 'rgba(28, 36, 68, 0.6)',                                                                                                        
                backdropFilter: 'blur(12px)',       
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
              }}                                                                     
            >   
              <video width="700px" controls autoPlay muted loop style={{ borderRadius: '12px', display: 'block' }}>
                <source src="../videos/bond_example.mp4" type="video/mp4" />                              
                <source src="../videos/bond_example.webm" type="video/webm" />
              </video>                                                        
            </div>
        </div>

      </section>

      {/* Section 2: How does Bond Work? */}
      <section className="px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <p className="font-bold text-4xl mb-12">How Bond helps your people</p>
          <div className="grid grid-cols-3 gap-6">
            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-amber) text-(--color-on-amber)">Step 1</span>
              <h3 className="text-xl font-bold">Create or Join your Crew</h3>
              <p className="text-xl leading-relaxed text-(--color-text-muted)">Set up your crew with your friends. Bond keeps everyone in the loop and make your plans a reality</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-tangerine) text-(--color-on-tangerine)">Step 2</span>
              <h3 className="text-xl font-bold">Bond creates your plan</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-muted)">Bond takes the guesswork out of planning. It suggests the right spot, time, and vibe based on what your crew is into, no back and forth needed.</p>
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-slate)' }}
              whileHover={{ y: -6, boxShadow: '0 0 32px #FFC23D22' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <span className="text-xs font-bold px-2 py-1 rounded-full w-fit bg-(--color-accent-electric) text-(--color-on-electric)">Step 3</span>
              <h3 className="text-xl font-bold">Just show up</h3>
              <p className="text-x1 leading-relaxed text-(--color-text-muted)">Once the plan is set, all that's left is showing up. No organizing, no coordinating. Bond handles it so you can focus on the moment.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Mission Statement */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-6 text-(--color-accent-tangerine)">
              Our Mission
            </p>

            <p className="text-2xl leading-relaxed text-(--color-text-cream)">
              We created Bond with belief that people are at their best when surrounded by good company. 
              We want to make going out with your friends easy and fulfilling.
              <span className="text-(--color-accent-amber"> No fuss, no long planning</span>, just living in the moment. That's what Bond is all about.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Waitlist */}
      <section id="waitlist">
        <div className="flex justify-center items-center">
          <div className="text-center mt-4 text-lg w-full">
            <p>Get early access!</p>
          </div>
        </div>
      </section>
      
    </div>
  )
}
