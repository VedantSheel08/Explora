import random
index=random.randint(1,3)
output=["rock","paper","scissor"]
user_choice=int(input("enter 1 for rock, 2 for paper, 3 for scissor"))

if user_choice == index:
    print(f'computer chose: {output[index-1]}, 2tie')
elif user_choice ==1 and index ==2:
    print(f'computer chose: {output[index-1]}, computer wins')
elif user_choice ==1 and index ==3:
    print(f'computer chose: {output[index-1]}, you win')
elif user_choice ==2 and index ==1:
    print(f'computer chose: {output[index-1]}, you win')
elif user_choice ==2 and index ==3:
    print(f'computer chose: {output[index-1]}, compuer wins')
elif user_choice ==3 and index ==1:
    print(f'computer chose: {output[index-1]}, compuer wins')
elif user_choice ==3 and index ==2:
    print(f'computer chose: {output[index-1]}, you wins')