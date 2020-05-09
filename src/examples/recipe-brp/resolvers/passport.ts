import { AttributeResolver } from '../../../types/types';

export const passportResolver: AttributeResolver = () =>
    Promise.resolve([
        {
            attribute_name: "firstname",
            attribute_value: randFirstName(),
        },
        {
            attribute_name: "lastname",
            attribute_value: randLastName(),
        },
        {
            attribute_name: "bsn",
            attribute_value: Math.floor(Math.random() * 1000000000).toString(10),
        }
    ])

function coin() {
    return Math.random() > 0.5;
}

function randFirstName() {
    const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel", "Matthew", "Anthony", "Donald", "Mark", "Paul", "Steven", "Andrew", "Kenneth", "Joshua", "George", "Kevin", "Brian", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Sharon", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Helen", "Nicholas", "Amy", "Eric", "Shirley", "Stephen", "Angela", "Jonathan", "Anna", "Larry", "Brenda", "Justin", "Pamela", "Scott", "Nicole", "Brandon", "Ruth", "Frank", "Katherine", "Benjamin", "Samantha", "Gregory", "Christine", "Samuel", "Emma", "Raymond", "Catherine", "Patrick", "Debra", "Alexander", "Virginia", "Jack", "Rachel", "Dennis", "Carolyn", "Jerry", "Janet", "Tyler", "Maria", "Aaron", "Heather", "Jose", "Diane", "Henry", "Julie", "Douglas", "Joyce", "Adam", "Victoria", "Peter", "Kelly", "Nathan", "Christina", "Zachary", "Joan", "Walter", "Evelyn", "Kyle", "Lauren", "Harold", "Judith", "Carl", "Olivia", "Jeremy", "Frances", "Keith", "Martha", "Roger", "Cheryl", "Gerald", "Megan", "Ethan", "Andrea", "Arthur", "Hannah", "Terry", "Jacqueline", "Christian", "Ann", "Sean", "Jean", "Lawrence", "Alice", "Austin", "Kathryn", "Joe", "Gloria", "Noah", "Teresa", "Jesse", "Doris", "Albert", "Sara", "Bryan", "Janice", "Billy", "Julia", "Bruce", "Marie", "Willie", "Madison", "Jordan", "Grace", "Dylan", "Judy", "Alan", "Theresa", "Ralph", "Beverly", "Gabriel", "Denise", "Roy", "Marilyn", "Juan", "Amber", "Wayne", "Danielle", "Eugene", "Abigail", "Logan", "Brittany", "Randy", "Rose", "Louis", "Diana", "Russell", "Natalie", "Vincent", "Sophia", "Philip", "Alexis", "Bobby", "Lori", "Johnny", "Kayla", "Bradley", "Jane"];
    return randItem(firstNames);
}

function randLastName() {
    const lastNames = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes", "Myers", "Ford", "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Cole", "West", "Jordan", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison", "Gibson", "Mcdonald", "Cruz", "Marshall", "Ortiz", "Gomez", "Murray", "Freeman"];
    return randItem(lastNames);
}

function randRange(a: number, b: number) {
    const n = b - a;
    const i = Math.floor((Math.random() * n)) % n;
    return i + a;
}

function randItem<T>(items: T[]): T | null {
    return items.length === 0 ? null : items[randRange(0, items.length)];
}

