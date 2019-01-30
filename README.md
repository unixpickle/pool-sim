# pool-sim

A simulator for the game [Pool](https://en.wikipedia.org/wiki/Pool_(cue_sports)).

# Goal

The ultimate goal is to be able to simulate games between various types of agents. The agents may include:

 * Random agent
 * An agent that tries N random choices and chooses the "best" one.
 * An agent that aims perfectly for one of its balls.
 * An agent optimized with reinforcement learning.

Once we can simulate games, we can gather various statistics, such as:

 * Win rate of one agent vs. another
 * Average move count in a game
 * Average number of scratches per game

# Status

Here's what's done so far:

 * A physics simulator
 * A set of rules implemented on top of the physics simulator
 * A demo that shows two random agents playing one another
